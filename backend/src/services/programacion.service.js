// Programación semanal de levantamientos: qué día estará cada auditor en qué
// sucursal y/o área. Colección "programacion", un documento por visita:
//   { fecha "AAAA-MM-DD", horaInicio, horaFin, sucursalId/Nombre, areaId/Nombre,
//     usuarioId/Nombre, nota, estado PENDIENTE|REALIZADA|CANCELADA, levantamientoId }
// Las consultas usan un solo campo (fecha) para no requerir índices compuestos
// en Firestore; el filtro por usuario se hace en memoria.
import db from "../config/firebase.js";
import { ROLES_GESTION } from "../config/roles.js";
import { resolverReferencias } from "./referencias.service.js";
import { ErrorHttp } from "../utils/errores.js";
import { hoyISO } from "../utils/fechas.js";

const COL = "programacion";
export const ESTADOS_PROGRAMACION = ["PENDIENTE", "REALIZADA", "CANCELADA"];

const FECHA = /^\d{4}-\d{2}-\d{2}$/;
const HORA = /^([01]\d|2[0-3]):[0-5]\d$/;
const t = (v) => String(v ?? "").trim();

const esGestion = (usuario) => ROLES_GESTION.includes(usuario.role);

// "2026-10-27" + 7 → "2026-11-03" (en UTC para no saltar por zona horaria)
export const sumarDias = (iso, dias) => {
    const [a, m, d] = iso.split("-").map(Number);
    const f = new Date(Date.UTC(a, m - 1, d + dias));
    return f.toISOString().slice(0, 10);
};

const ordenar = (lista) =>
    lista.sort((a, b) => a.fecha.localeCompare(b.fecha) || (a.horaInicio || "99").localeCompare(b.horaInicio || "99") || (a.sucursalNombre || "").localeCompare(b.sucursalNombre || ""));

const leerUsuario = async (uid) => {
    const doc = await db.collection("usuarios").doc(uid).get();
    if (!doc.exists || doc.data().activo === false) throw new ErrorHttp(400, "El usuario seleccionado no existe o está inactivo.");
    return { uid: doc.id, ...doc.data() };
};

// Solo Administrador / Responsable inventario programan visitas de otros.
const usuarioDestino = async (usuarioId, usuario) => {
    if (!usuarioId || usuarioId === usuario.uid) return usuario;
    if (!esGestion(usuario)) throw new ErrorHttp(403, "Solo puedes programar tus propias visitas.");
    return leerUsuario(usuarioId);
};

const validar = (d) => {
    if (!FECHA.test(t(d.fecha))) return "Indica una fecha válida.";
    if (!t(d.sucursalId) && !t(d.areaId)) return "Indica la sucursal o el área que vas a levantar.";
    if (t(d.horaInicio) && !HORA.test(t(d.horaInicio))) return "La hora de inicio no es válida.";
    if (t(d.horaFin) && !HORA.test(t(d.horaFin))) return "La hora de fin no es válida.";
    if (t(d.horaInicio) && t(d.horaFin) && t(d.horaFin) <= t(d.horaInicio)) return "La hora de fin debe ser mayor que la de inicio.";
    if (t(d.nota).length > 300) return "La nota admite hasta 300 caracteres.";
    return null;
};

const armar = async (d, destino) => {
    const { sucursal, area } = await resolverReferencias({ sucursalId: t(d.sucursalId) || null, areaId: t(d.areaId) || null });
    return {
        fecha: t(d.fecha),
        horaInicio: t(d.horaInicio) || null,
        horaFin: t(d.horaFin) || null,
        sucursalId: sucursal?.id || null,
        sucursalNombre: sucursal?.nombre || "",
        areaId: area?.id || null,
        areaNombre: area?.nombre || "",
        usuarioId: destino.uid,
        usuarioNombre: destino.name || destino.email || "",
        nota: t(d.nota)
    };
};

const leer = async (id) => {
    const doc = await db.collection(COL).doc(id).get();
    if (!doc.exists) throw new ErrorHttp(404, "Visita programada no encontrada.");
    return { id: doc.id, ...doc.data() };
};

const puedeModificar = (visita, usuario) => {
    if (visita.usuarioId !== usuario.uid && !esGestion(usuario)) throw new ErrorHttp(403, "No puedes modificar la programación de otro usuario.");
};

// GET ?desde&hasta&usuarioId|todos
export const listar = async (usuario, { desde, hasta, usuarioId, todos } = {}) => {
    const ini = FECHA.test(desde || "") ? desde : hoyISO();
    const fin = FECHA.test(hasta || "") ? hasta : sumarDias(ini, 6);
    if (fin < ini) throw new ErrorHttp(400, "El rango de fechas no es válido.");
    if (fin > sumarDias(ini, 62)) throw new ErrorHttp(400, "Consulta como máximo dos meses a la vez.");

    const snap = await db.collection(COL).where("fecha", ">=", ini).where("fecha", "<=", fin).get();
    let lista = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

    // Auditor: solo lo suyo. Gestión: lo suyo, el de un usuario o el de todos.
    if (!esGestion(usuario)) lista = lista.filter((v) => v.usuarioId === usuario.uid);
    else if (todos !== "true") lista = lista.filter((v) => v.usuarioId === (usuarioId || usuario.uid));

    return ordenar(lista);
};

// Visitas de hoy del usuario, con los datos de ubicación de la sucursal.
export const deHoy = async (usuario) => {
    const hoy = hoyISO();
    const snap = await db.collection(COL).where("fecha", "==", hoy).get();
    const visitas = ordenar(snap.docs.map((d) => ({ id: d.id, ...d.data() })).filter((v) => v.usuarioId === usuario.uid && v.estado !== "CANCELADA"));

    const ids = [...new Set(visitas.map((v) => v.sucursalId).filter(Boolean))];
    const docs = await Promise.all(ids.map((id) => db.collection("sucursales").doc(id).get()));
    const sucursales = Object.fromEntries(docs.filter((d) => d.exists).map((d) => [d.id, d.data()]));

    return {
        fecha: hoy,
        visitas: visitas.map((v) => {
            const s = sucursales[v.sucursalId];
            return s ? { ...v, sucursal: { direccion: s.direccion || "", ciudad: s.ciudad || "", lat: s.lat ?? null, lng: s.lng ?? null } } : v;
        })
    };
};

export const crear = async (datos, usuario) => {
    const error = validar(datos);
    if (error) throw new ErrorHttp(400, error);
    const destino = await usuarioDestino(t(datos.usuarioId), usuario);
    const visita = await armar(datos, destino);

    const fecha = new Date().toISOString();
    const completo = { ...visita, estado: "PENDIENTE", levantamientoId: null, creadoPor: usuario.name || null, creadoPorId: usuario.uid, fechaRegistro: fecha, fechaActualizacion: fecha };
    const ref = await db.collection(COL).add(completo);
    return { id: ref.id, ...completo };
};

export const actualizar = async (id, datos, usuario) => {
    const actual = await leer(id);
    puedeModificar(actual, usuario);
    const combinado = { ...actual, ...datos };
    const error = validar(combinado);
    if (error) throw new ErrorHttp(400, error);
    const destino = await usuarioDestino(t(combinado.usuarioId), usuario);
    const cambios = { ...(await armar(combinado, destino)), fechaActualizacion: new Date().toISOString() };
    if (datos.estado !== undefined) {
        if (!ESTADOS_PROGRAMACION.includes(datos.estado)) throw new ErrorHttp(400, "Estado no válido.");
        cambios.estado = datos.estado;
    }
    await db.collection(COL).doc(id).update(cambios);
    return { ...actual, ...cambios };
};

// Se llama al iniciar un levantamiento desde la visita programada.
export const marcarRealizada = async (id, levantamientoId, usuario) => {
    const actual = await leer(id);
    puedeModificar(actual, usuario);
    const cambios = { estado: "REALIZADA", levantamientoId: t(levantamientoId) || null, fechaActualizacion: new Date().toISOString() };
    await db.collection(COL).doc(id).update(cambios);
    return { ...actual, ...cambios };
};

export const eliminar = async (id, usuario) => {
    const actual = await leer(id);
    puedeModificar(actual, usuario);
    await db.collection(COL).doc(id).delete();
};

// Copia las visitas de la semana que inicia en "desde" a la semana que inicia
// en "hacia" (mismo día de la semana). No duplica las que ya existan.
export const copiarSemana = async ({ desde, hacia, usuarioId }, usuario) => {
    if (!FECHA.test(desde || "") || !FECHA.test(hacia || "")) throw new ErrorHttp(400, "Indica las semanas de origen y destino.");
    const destino = await usuarioDestino(t(usuarioId), usuario);

    const origen = (await listar(usuario, { desde, hasta: sumarDias(desde, 6), usuarioId: destino.uid })).filter((v) => v.estado !== "CANCELADA");
    if (!origen.length) throw new ErrorHttp(400, "La semana de origen no tiene visitas programadas.");

    const existentes = await listar(usuario, { desde: hacia, hasta: sumarDias(hacia, 6), usuarioId: destino.uid });
    const clave = (v) => `${v.fecha}|${v.sucursalId || ""}|${v.areaId || ""}`;
    const ya = new Set(existentes.map(clave));

    const [a1, m1, d1] = desde.split("-").map(Number);
    const [a2, m2, d2] = hacia.split("-").map(Number);
    const desfase = Math.round((Date.UTC(a2, m2 - 1, d2) - Date.UTC(a1, m1 - 1, d1)) / 86400000);

    const fecha = new Date().toISOString();
    const batch = db.batch();
    let creadas = 0;
    origen.forEach((v) => {
        const nueva = {
            fecha: sumarDias(v.fecha, desfase),
            horaInicio: v.horaInicio || null, horaFin: v.horaFin || null,
            sucursalId: v.sucursalId || null, sucursalNombre: v.sucursalNombre || "",
            areaId: v.areaId || null, areaNombre: v.areaNombre || "",
            usuarioId: v.usuarioId, usuarioNombre: v.usuarioNombre || "",
            nota: v.nota || "", estado: "PENDIENTE", levantamientoId: null,
            creadoPor: usuario.name || null, creadoPorId: usuario.uid, fechaRegistro: fecha, fechaActualizacion: fecha
        };
        if (ya.has(clave(nueva))) return;
        ya.add(clave(nueva));
        batch.set(db.collection(COL).doc(), nueva);
        creadas++;
    });
    if (creadas) await batch.commit();
    return { creadas, omitidas: origen.length - creadas };
};
