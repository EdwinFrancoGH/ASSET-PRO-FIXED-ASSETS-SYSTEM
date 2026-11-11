import crypto from "crypto";
import db from "../config/firebase.js";
import { ROLES, ROLES_GESTION, ROLES_LEVANTAMIENTO } from "../config/roles.js";
import { ESTADOS, ESTADOS_LEVANTAMIENTO, LISTA_CONDICIONES, CONDICIONES } from "../config/activos.js";
import { ErrorHttp } from "../utils/errores.js";
import { hoyISO } from "../utils/fechas.js";
import { siguienteNumero, rellenar } from "../utils/contadores.js";
import { resolverReferencias } from "./referencias.service.js";
import { prepararActivo, registrarAlta } from "./activos.service.js";
import { registrar as registrarMovimiento } from "./movimientos.service.js";
import { obtenerUsuariosPorRol, notificar } from "./notificaciones.service.js";

// Levantamiento físico de activos = hoja AUDITORIA_AF del Excel.
// Encabezado: sucursal/área, responsable del activo, líder de área, auditor y
// fecha. Líneas: activos revisados (encontrado, condición, observaciones) y
// hallazgos (activos encontrados que no estaban registrados). Al cerrarlo se
// actualiza el consolidado (hoja MAIN) y se puede imprimir el ACTA.

const COLECCION = "levantamientos";
const t = (v) => String(v ?? "").trim();
const { EN_PROCESO, CERRADO } = ESTADOS_LEVANTAMIENTO;

const esGestion = (u) => ROLES_GESTION.includes(u.role);
const puedeVer = (lev, u) => u.role !== ROLES.AUDITOR || lev.auditorId === u.uid || lev.creadoPorId === u.uid;
const puedeEditar = (lev, u) => ROLES_LEVANTAMIENTO.includes(u.role) && (esGestion(u) || lev.auditorId === u.uid || lev.creadoPorId === u.uid);

export const leer = async (id, usuario) => {
    if (!/^[A-Za-z0-9_-]{1,64}$/.test(String(id || ""))) throw new ErrorHttp(404, "Levantamiento no encontrado.");
    const doc = await db.collection(COLECCION).doc(id).get();
    if (!doc.exists) throw new ErrorHttp(404, "Levantamiento no encontrado.");
    const lev = { id: doc.id, ...doc.data() };
    if (!puedeVer(lev, usuario)) throw new ErrorHttp(403, "Este levantamiento está asignado a otro auditor.");
    return { ...lev, puedeEditar: lev.estado === EN_PROCESO && puedeEditar(lev, usuario) };
};

// --------------------------------------------------------- encabezado
const resolverEncabezado = async (datos) => {
    if (!datos.sucursalId && !datos.areaId) throw new ErrorHttp(400, "Indica la sucursal o el área que se levanta.");
    if (datos.fecha && !/^\d{4}-\d{2}-\d{2}$/.test(datos.fecha)) throw new ErrorHttp(400, "La fecha del levantamiento no es válida.");

    const { sucursal, area, responsable } = await resolverReferencias({
        sucursalId: datos.sucursalId || null, areaId: datos.areaId || null, responsableId: datos.responsableId || null
    });
    const [lider, auditorDoc] = await Promise.all([
        datos.liderId ? db.collection("asociados").doc(datos.liderId).get() : null,
        datos.auditorId ? db.collection("usuarios").doc(datos.auditorId).get() : null
    ]);
    if (datos.liderId && !lider?.exists) throw new ErrorHttp(400, "El líder de área seleccionado no existe.");
    if (!auditorDoc?.exists || !ROLES_LEVANTAMIENTO.includes(auditorDoc.data().role)) throw new ErrorHttp(400, "Selecciona el auditor del levantamiento.");

    // Si no se indica, el líder es el definido para el área en Catálogos.
    const liderId = lider?.exists ? lider.id : area?.liderId || null;
    const liderNombre = lider?.exists ? lider.data().nombre : area?.liderNombre || "";

    return {
        fecha: datos.fecha || hoyISO(),
        sucursalId: sucursal?.id || null, sucursalNombre: sucursal?.nombre || "",
        areaId: area?.id || null, areaNombre: area?.nombre || "",
        responsableId: responsable?.id || null, responsableNombre: responsable?.nombre || "",
        liderId, liderNombre,
        auditorId: auditorDoc.id, auditorNombre: auditorDoc.data().name,
        observacionesGenerales: t(datos.observacionesGenerales)
    };
};

// ------------------------------------------------------------- líneas
const leerActivos = async (ids) => {
    if (!ids.length) return new Map();
    const refs = ids.map((id) => db.collection("activos").doc(id));
    const docs = await db.getAll(...refs);
    return new Map(docs.filter((d) => d.exists).map((d) => [d.id, { id: d.id, ...d.data() }]));
};

// Diferencias entre lo registrado y lo que dice el encabezado del levantamiento.
const diferenciasDe = (activo, enc) => {
    const d = [];
    if (enc.sucursalId && activo.sucursalId !== enc.sucursalId) d.push(`Sucursal: ${activo.sucursalNombre || "sin sucursal"} → ${enc.sucursalNombre}`);
    if (enc.areaId && activo.areaId !== enc.areaId) d.push(`Área: ${activo.areaNombre || "sin área"} → ${enc.areaNombre}`);
    if (enc.responsableId && activo.responsableId !== enc.responsableId) d.push(`Responsable: ${activo.responsableNombre || "sin responsable"} → ${enc.responsableNombre}`);
    return d;
};

const prepararLineas = async (lineas = [], enc) => {
    if (!Array.isArray(lineas)) throw new ErrorHttp(400, "Las líneas del levantamiento no tienen un formato válido.");
    if (lineas.length > 400) throw new ErrorHttp(400, "Un levantamiento admite como máximo 400 líneas.");

    const ids = lineas.filter((l) => !l.esHallazgo).map((l) => l.activoId);
    if (new Set(ids).size !== ids.length) throw new ErrorHttp(400, "Hay activos repetidos en el levantamiento.");
    const activos = await leerActivos(ids.filter(Boolean));
    const tiposSnap = await db.collection("tiposActivo").get();
    const tipos = new Map(tiposSnap.docs.map((d) => [d.id, d.data()]));

    return lineas.map((l, i) => {
        const condicion = LISTA_CONDICIONES.includes(l.condicion) ? l.condicion : CONDICIONES.BUENO;
        const base = { id: l.id || crypto.randomUUID(), condicion, observaciones: t(l.observaciones).slice(0, 500) };

        if (l.esHallazgo) {
            return {
                ...base,
                esHallazgo: true,
                encontrado: true,
                activoId: l.activoId || null,
                idActivo: l.idActivo || "",
                codigo: l.codigo || "",
                tipoId: l.tipoId || null,
                tipoNombre: tipos.get(l.tipoId)?.nombre || "",
                descripcion: t(l.descripcion),
                marca: t(l.marca),
                modelo: t(l.modelo),
                serie: t(l.serie).toUpperCase(),
                diferencias: []
            };
        }

        const a = activos.get(l.activoId);
        if (!a) throw new ErrorHttp(400, `Línea ${i + 1}: el activo no existe.`);
        if (a.estado === ESTADOS.BAJA) throw new ErrorHttp(400, `Línea ${i + 1}: ${a.codigo} está dado de baja.`);
        const encontrado = l.encontrado !== false;
        return {
            ...base,
            esHallazgo: false,
            encontrado,
            activoId: a.id,
            idActivo: a.idActivo,
            codigo: a.codigo,
            tipoId: a.tipoId,
            tipoNombre: a.tipoNombre,
            descripcion: a.descripcion,
            marca: a.marca,
            modelo: a.modelo,
            serie: a.serie,
            estadoSistema: a.estado,
            responsableSistemaNombre: a.responsableNombre || "",
            areaSistemaNombre: a.areaNombre || "",
            sucursalSistemaNombre: a.sucursalNombre || "",
            diferencias: encontrado ? diferenciasDe(a, enc) : []
        };
    });
};

const resumenDe = (lineas) => ({
    total: lineas.length,
    encontrados: lineas.filter((l) => !l.esHallazgo && l.encontrado).length,
    noEncontrados: lineas.filter((l) => !l.esHallazgo && !l.encontrado).length,
    hallazgos: lineas.filter((l) => l.esHallazgo).length,
    conDiferencias: lineas.filter((l) => l.diferencias?.length).length,
    malos: lineas.filter((l) => l.encontrado && l.condicion === CONDICIONES.MALO).length
});

// Activos vigentes de la sucursal/área (y del responsable, si se indica):
// la lista inicial que el auditor va confirmando.
const activosDelAlcance = async (enc) => {
    let consulta = db.collection("activos");
    if (enc.areaId) consulta = consulta.where("areaId", "==", enc.areaId);
    else consulta = consulta.where("sucursalId", "==", enc.sucursalId);
    const snap = await consulta.get();
    return snap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .filter((a) => a.estado !== ESTADOS.BAJA)
        .filter((a) => !enc.sucursalId || a.sucursalId === enc.sucursalId)
        .filter((a) => !enc.responsableId || a.responsableId === enc.responsableId)
        .sort((a, b) => (a.codigo || "").localeCompare(b.codigo || ""))
        .map((a) => ({ activoId: a.id, encontrado: true, condicion: a.condicion || CONDICIONES.BUENO, observaciones: "" }));
};

// --------------------------------------------------------------- CRUD
export const listar = async (usuario, filtros = {}) => {
    const snap = await db.collection(COLECCION).get();
    const q = t(filtros.q).toLowerCase();
    return snap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .filter((l) => puedeVer(l, usuario))
        .filter((l) => !filtros.estado || l.estado === filtros.estado)
        .filter((l) => !q || [l.numero, l.sucursalNombre, l.areaNombre, l.responsableNombre, l.liderNombre, l.auditorNombre].some((v) => String(v || "").toLowerCase().includes(q)))
        .sort((a, b) => b.fechaCreacion.localeCompare(a.fechaCreacion))
        .map(({ lineas, activoIds, ...resto }) => resto);
};

export const crear = async (datos, usuario) => {
    // Si no se elige auditor, lo es quien crea el levantamiento.
    const enc = await resolverEncabezado({ ...datos, auditorId: datos.auditorId || usuario.uid });
    const lineasCliente = datos.cargarActivos ? await activosDelAlcance(enc) : [];
    const lineas = await prepararLineas(lineasCliente, enc);
    const anio = enc.fecha.slice(0, 4);
    const numero = `LEV-${anio}-${rellenar(await siguienteNumero(`levantamientos_${anio}`), 4)}`;
    const ahora = new Date().toISOString();

    const lev = {
        numero,
        estado: EN_PROCESO,
        ...enc,
        lineas,
        activoIds: lineas.map((l) => l.activoId).filter(Boolean),
        resumen: resumenDe(lineas),
        creadoPorId: usuario.uid,
        creadoPorNombre: usuario.name,
        fechaCreacion: ahora,
        fechaActualizacion: ahora
    };
    const ref = await db.collection(COLECCION).add(lev);

    if (enc.auditorId !== usuario.uid) {
        notificar({
            usuarioIds: [enc.auditorId],
            titulo: "Levantamiento asignado",
            mensaje: `${usuario.name} te asignó el levantamiento ${numero} (${[enc.sucursalNombre, enc.areaNombre].filter(Boolean).join(" · ")}) para el ${enc.fecha}.`,
            enlace: `/levantamientos/${ref.id}`
        });
    }
    return { id: ref.id, ...lev };
};

// Guarda encabezado y líneas (reemplaza las líneas completas).
export const guardar = async (id, datos, usuario) => {
    const lev = await leer(id, usuario);
    if (lev.estado !== EN_PROCESO) throw new ErrorHttp(400, "El levantamiento ya está cerrado.");
    if (!puedeEditar(lev, usuario)) throw new ErrorHttp(403, "No puedes modificar este levantamiento.");

    const enc = await resolverEncabezado({ ...lev, ...datos, auditorId: datos.auditorId || lev.auditorId });
    const lineas = await prepararLineas(datos.lineas ?? lev.lineas, enc);
    const cambios = {
        ...enc,
        lineas,
        activoIds: lineas.map((l) => l.activoId).filter(Boolean),
        resumen: resumenDe(lineas),
        fechaActualizacion: new Date().toISOString()
    };
    await db.collection(COLECCION).doc(id).update(cambios);
    return { ...lev, ...cambios };
};

export const eliminar = async (id, usuario) => {
    const lev = await leer(id, usuario);
    if (lev.estado !== EN_PROCESO) throw new ErrorHttp(400, "Un levantamiento cerrado no se elimina: es parte del historial de los activos.");
    if (!esGestion(usuario) && lev.creadoPorId !== usuario.uid) throw new ErrorHttp(403, "Solo quien lo creó o el Responsable de inventario puede eliminarlo.");
    await db.collection(COLECCION).doc(id).delete();
};

// --------------------------------------------------------------- cierre
// Equivale a "GuardarEnMain": cada activo revisado recibe la fecha, el
// auditor y la condición del levantamiento; los no encontrados quedan
// marcados como "no localizados"; los hallazgos se registran como activos
// nuevos. Opcional: aplicar las diferencias de ubicación/responsable con
// un movimiento de Traslado.
export const cerrar = async (id, { aplicarDiferencias = false } = {}, usuario) => {
    const lev = await leer(id, usuario);
    if (lev.estado !== EN_PROCESO) throw new ErrorHttp(400, "El levantamiento ya está cerrado.");
    if (!puedeEditar(lev, usuario)) throw new ErrorHttp(403, "No puedes cerrar este levantamiento.");
    if (!lev.lineas?.length) throw new ErrorHttp(400, "Agrega al menos un activo antes de cerrar el levantamiento.");

    lev.lineas.forEach((l, i) => {
        if (l.esHallazgo && (!l.tipoId || t(l.descripcion).length < 3)) {
            throw new ErrorHttp(400, `Hallazgo de la línea ${i + 1}: indica el tipo y la descripción del activo.`);
        }
    });

    const avisos = [];
    const lineas = [...lev.lineas];

    // 1. Hallazgos → activos nuevos (con el responsable/área del encabezado).
    const batchAlta = db.batch();
    const altas = [];
    for (const [i, l] of lineas.entries()) {
        if (!l.esHallazgo || l.activoId) continue;
        const activo = await prepararActivo({
            tipoId: l.tipoId, descripcion: l.descripcion, marca: l.marca, modelo: l.modelo, serie: l.serie,
            condicion: l.condicion, observaciones: l.observaciones,
            sucursalId: lev.sucursalId, areaId: lev.areaId, responsableId: lev.responsableId
        }, usuario, { origenAlta: `Hallazgo del levantamiento ${lev.numero}.` });
        const ref = db.collection("activos").doc();
        batchAlta.set(ref, activo);
        altas.push({ ref, activo });
        lineas[i] = { ...l, activoId: ref.id, idActivo: activo.idActivo, codigo: activo.codigo };
    }
    if (altas.length) await batchAlta.commit();
    for (const { ref, activo } of altas) {
        await registrarAlta(ref, activo, usuario, `MOV-${rellenar(await siguienteNumero("movimientos"), 5)}`);
    }

    // 2. Diferencias → Traslado (opcional).
    if (aplicarDiferencias) {
        for (const l of lineas.filter((x) => !x.esHallazgo && x.encontrado && x.diferencias?.length)) {
            try {
                await registrarMovimiento(l.activoId, {
                    tipo: "TRASLADO",
                    fecha: lev.fecha,
                    ...(lev.sucursalId ? { sucursalId: lev.sucursalId } : {}),
                    ...(lev.areaId ? { areaId: lev.areaId } : {}),
                    ...(lev.responsableId ? { responsableId: lev.responsableId } : {}),
                    comentario: `Ajuste por levantamiento ${lev.numero}: ${l.diferencias.join("; ")}.`,
                    levantamientoId: id
                }, usuario);
            } catch (e) {
                avisos.push(`${l.codigo}: no se aplicó el traslado (${e.message})`);
            }
        }
    }

    // 3. Última auditoría en cada activo (consolidado MAIN).
    const ahora = new Date().toISOString();
    const batch = db.batch();
    lineas.filter((l) => l.activoId).forEach((l) => {
        batch.update(db.collection("activos").doc(l.activoId), {
            ultimaAuditoria: {
                levantamientoId: id, numero: lev.numero, fecha: lev.fecha,
                auditorNombre: lev.auditorNombre, liderNombre: lev.liderNombre,
                encontrado: l.encontrado, condicion: l.condicion, observaciones: l.observaciones
            },
            ...(l.encontrado ? { condicion: l.condicion } : {}),
            noLocalizado: !l.encontrado,
            fechaActualizacion: ahora
        });
    });
    const cambios = {
        estado: CERRADO,
        lineas,
        activoIds: lineas.map((l) => l.activoId).filter(Boolean),
        resumen: resumenDe(lineas),
        aplicoDiferencias: Boolean(aplicarDiferencias),
        avisosCierre: avisos,
        fechaCierre: ahora,
        cerradoPorId: usuario.uid,
        cerradoPorNombre: usuario.name,
        fechaActualizacion: ahora
    };
    batch.update(db.collection(COLECCION).doc(id), cambios);
    await batch.commit();

    const r = cambios.resumen;
    const gestores = await obtenerUsuariosPorRol(ROLES.ADMIN, ROLES.INVENTARIO);
    notificar({
        usuarioIds: [...gestores.map((u) => u.uid), lev.creadoPorId, lev.auditorId],
        excluir: usuario.uid,
        titulo: r.noEncontrados ? "Levantamiento cerrado con faltantes" : "Levantamiento cerrado",
        mensaje: `${lev.numero} (${[lev.sucursalNombre, lev.areaNombre].filter(Boolean).join(" · ")}): ${r.encontrados} encontrados, ${r.noEncontrados} no localizados, ${r.hallazgos} hallazgos.`,
        enlace: `/levantamientos/${id}`
    });

    return { ...lev, ...cambios, puedeEditar: false };
};
