// Permisos configurables por el Administrador (documento configuracion/permisos).
// Definen qué puede modificar el Auditor. Administrador y Responsable inventario
// siempre pueden; Consulta nunca.
//   {
//     auditor: {
//       catalogos: { "tipos-activo": true, sucursales: true, areas: true, asociados: true },
//       activos:   { editar: true, movimientos: true }
//     }
//   }
import db from "../config/firebase.js";
import { ROLES } from "../config/roles.js";
import { ErrorHttp } from "../utils/errores.js";

export const CATALOGOS_CONFIGURABLES = ["tipos-activo", "sucursales", "areas", "asociados"];
// editar: datos del activo (botón "Editar"); movimientos: "Registrar movimiento".
export const ACCIONES_ACTIVOS = ["editar", "movimientos"];

// Por defecto el Auditor tiene todo habilitado; el Administrador lo va cerrando.
const SECCIONES = { catalogos: CATALOGOS_CONFIGURABLES, activos: ACCIONES_ACTIVOS };

const ref = () => db.collection("configuracion").doc("permisos");

// Caché corta: los permisos se consultan en cada escritura.
let cache = null;
let cacheHasta = 0;

const normalizar = (datos = {}) => ({
    auditor: Object.fromEntries(
        Object.entries(SECCIONES).map(([seccion, claves]) => [
            seccion,
            Object.fromEntries(claves.map((k) => {
                const v = datos.auditor?.[seccion]?.[k];
                return [k, v === undefined ? true : v === true];
            }))
        ])
    )
});

export const obtenerPermisos = async () => {
    if (cache && Date.now() < cacheHasta) return cache;
    const doc = await ref().get();
    const datos = doc.exists ? doc.data() : {};
    cache = { ...normalizar(datos), actualizadoPor: datos.actualizadoPor || null, fechaActualizacion: datos.fechaActualizacion || null };
    cacheHasta = Date.now() + 30 * 1000;
    return cache;
};

export const guardarPermisos = async (datos, usuario) => {
    const entrada = datos?.auditor;
    if (!entrada || typeof entrada !== "object") throw new ErrorHttp(400, "Formato de permisos no válido.");
    const actual = await obtenerPermisos();
    const combinado = { auditor: Object.fromEntries(Object.keys(SECCIONES).map((s) => [s, { ...actual.auditor[s], ...(entrada[s] || {}) }])) };
    const completo = { ...normalizar(combinado), actualizadoPor: usuario.name || usuario.email || null, fechaActualizacion: new Date().toISOString() };
    await ref().set(completo);
    cache = completo;
    cacheHasta = Date.now() + 30 * 1000;
    return completo;
};

// ¿Puede este usuario hacer `clave` dentro de `seccion` ("catalogos" | "activos")?
export const tienePermiso = async (usuario, seccion, clave) => {
    if ([ROLES.ADMIN, ROLES.INVENTARIO].includes(usuario?.role)) return true;
    if (usuario?.role !== ROLES.AUDITOR) return false;
    const permisos = await obtenerPermisos();
    return permisos.auditor[seccion]?.[clave] === true;
};

export const puedeEditarCatalogo = (usuario, catalogo) => tienePermiso(usuario, "catalogos", catalogo);

// Middleware: requierePermiso("activos", "movimientos")
export const requierePermiso = (seccion, clave) => async (req, res, next) => {
    try {
        if (await tienePermiso(req.usuario, seccion, clave)) return next();
        return res.status(403).json({ ok: false, message: "No tienes permiso para realizar esta acción. Pídelo al Administrador." });
    } catch (e) {
        next(e);
    }
};

// Permisos efectivos del usuario (los usa /auth/me para el frontend).
export const permisosDe = async (usuario) =>
    Object.fromEntries(await Promise.all(Object.entries(SECCIONES).map(async ([seccion, claves]) => [
        seccion,
        Object.fromEntries(await Promise.all(claves.map(async (k) => [k, await tienePermiso(usuario, seccion, k)])))
    ])));
