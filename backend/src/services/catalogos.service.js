import db from "../config/firebase.js";
import { prefijoDeNombre } from "../config/activos.js";
import { ErrorHttp } from "../utils/errores.js";
import { geocodificar, coordenadaValida } from "./ubicacion.service.js";

// Catálogos (hoja BD del Excel). Nombre en la URL → colección en Firestore.
//   tipos-activo → NOMBRE_PERIFERICO (LAPTOP, IMPRESORA…) con su prefijo de código
//   sucursales   → SUCURSALES (MEGA, METRO 1…) con ciudad
//   areas        → áreas, con su líder de área (asociado)
//   asociados    → ASOCIADO / AREA: personas responsables de activos
export const CATALOGOS = {
    "tipos-activo": "tiposActivo",
    sucursales: "sucursales",
    areas: "areas",
    asociados: "asociados"
};

export const NOMBRES = { "tipos-activo": "Tipo de activo", sucursales: "Sucursal", areas: "Área", asociados: "Asociado" };

const t = (v) => String(v ?? "").trim();
const ordenar = (lista) => lista.sort((a, b) => (a.nombre || "").localeCompare(b.nombre || "", "es"));

export const obtenerTodos = async (catalogo, { soloActivos = false } = {}) => {
    const snapshot = await db.collection(CATALOGOS[catalogo]).get();
    const lista = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    return ordenar(soloActivos ? lista.filter((x) => x.activo !== false) : lista);
};

export const obtenerPorId = async (catalogo, id) => {
    if (!id) return null;
    const doc = await db.collection(CATALOGOS[catalogo]).doc(id).get();
    return doc.exists ? { id: doc.id, ...doc.data() } : null;
};

// Solo se guardan los campos esperados de cada catálogo. Los nombres de
// referencias (área, sucursal, líder) se copian para mostrar sin consultas extra.
const normalizar = async (catalogo, datos) => {
    const base = { nombre: t(datos.nombre), activo: datos.activo !== false && datos.activo !== "false" };

    if (catalogo === "tipos-activo") {
        base.nombre = base.nombre.toUpperCase();
        base.prefijo = (t(datos.prefijo) || prefijoDeNombre(base.nombre)).toUpperCase().slice(0, 5);
        base.vidaUtilAnios = datos.vidaUtilAnios === "" || datos.vidaUtilAnios == null ? null : Number(datos.vidaUtilAnios);
    }

    if (catalogo === "sucursales") {
        base.nombre = base.nombre.toUpperCase();
        base.ciudad = t(datos.ciudad);
        // Ubicación para el mapa y la "sucursal más cercana". Si no se dan
        // coordenadas pero sí dirección, se buscan con Google Geocoding.
        base.direccion = t(datos.direccion);
        const lat = datos.lat === "" || datos.lat == null ? NaN : Number(datos.lat);
        const lng = datos.lng === "" || datos.lng == null ? NaN : Number(datos.lng);
        if (coordenadaValida(lat, lng)) {
            base.lat = lat;
            base.lng = lng;
        } else {
            const geo = base.direccion ? await geocodificar([base.direccion, base.ciudad, "El Salvador"].filter(Boolean).join(", ")) : null;
            base.lat = geo?.lat ?? null;
            base.lng = geo?.lng ?? null;
        }
    }

    if (catalogo === "areas") {
        const lider = await obtenerPorId("asociados", datos.liderId);
        base.liderId = lider?.id || null;
        base.liderNombre = lider?.nombre || "";
    }

    if (catalogo === "asociados") {
        base.nombre = base.nombre.toUpperCase();
        base.cargo = t(datos.cargo);
        base.correo = t(datos.correo);
        const [area, sucursal] = await Promise.all([obtenerPorId("areas", datos.areaId), obtenerPorId("sucursales", datos.sucursalId)]);
        base.areaId = area?.id || null;
        base.areaNombre = area?.nombre || "";
        base.sucursalId = sucursal?.id || null;
        base.sucursalNombre = sucursal?.nombre || "";
    }

    return base;
};

const nombreRepetido = async (catalogo, nombre, idActual = null) => {
    const snap = await db.collection(CATALOGOS[catalogo]).where("nombre", "==", nombre).get();
    return snap.docs.some((d) => d.id !== idActual);
};

export const crear = async (catalogo, datos, usuario) => {
    const registro = await normalizar(catalogo, datos);
    if (await nombreRepetido(catalogo, registro.nombre)) {
        throw new ErrorHttp(400, `Ya existe un registro llamado "${registro.nombre}".`);
    }
    const fecha = new Date().toISOString();
    const completo = { ...registro, creadoPor: usuario?.name || null, fechaRegistro: fecha, fechaActualizacion: fecha };
    const ref = await db.collection(CATALOGOS[catalogo]).add(completo);
    return { id: ref.id, ...completo };
};

export const actualizar = async (catalogo, id, datos) => {
    const ref = db.collection(CATALOGOS[catalogo]).doc(id);
    const doc = await ref.get();
    if (!doc.exists) return null;

    const cambios = { ...(await normalizar(catalogo, { ...doc.data(), ...datos })), fechaActualizacion: new Date().toISOString() };
    if (await nombreRepetido(catalogo, cambios.nombre, id)) {
        throw new ErrorHttp(400, `Ya existe un registro llamado "${cambios.nombre}".`);
    }
    await ref.update(cambios);

    // Un asociado que cambia de nombre: se actualiza el nombre del líder en sus áreas.
    if (catalogo === "asociados" && cambios.nombre !== doc.data().nombre) {
        const areas = await db.collection("areas").where("liderId", "==", id).get();
        await Promise.all(areas.docs.map((a) => a.ref.update({ liderNombre: cambios.nombre })));
    }
    return { id, ...doc.data(), ...cambios };
};

// Un registro usado por algún activo no se elimina (se desactiva).
const CAMPO_EN_ACTIVOS = { "tipos-activo": "tipoId", sucursales: "sucursalId", areas: "areaId", asociados: "responsableId" };

export const eliminar = async (catalogo, id) => {
    const ref = db.collection(CATALOGOS[catalogo]).doc(id);
    const doc = await ref.get();
    if (!doc.exists) return false;

    const uso = await db.collection("activos").where(CAMPO_EN_ACTIVOS[catalogo], "==", id).limit(1).get();
    if (!uso.empty) {
        throw new ErrorHttp(400, "No se puede eliminar porque hay activos que lo usan. Desactívalo en su lugar.");
    }
    await ref.delete();
    return true;
};
