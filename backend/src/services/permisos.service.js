// Permisos configurables por el Administrador (documento configuracion/permisos).
// Hoy: qué catálogos puede modificar el Auditor. Administrador y Responsable
// inventario siempre pueden; Consulta nunca.
//   { auditor: { catalogos: { "tipos-activo": true, sucursales: true, areas: true, asociados: true } } }
import db from "../config/firebase.js";
import { ROLES } from "../config/roles.js";
import { ErrorHttp } from "../utils/errores.js";

export const CATALOGOS_CONFIGURABLES = ["tipos-activo", "sucursales", "areas", "asociados"];

// Por defecto el Auditor administra todos los catálogos; el Administrador los va cerrando.
const PREDETERMINADO = { auditor: { catalogos: Object.fromEntries(CATALOGOS_CONFIGURABLES.map((c) => [c, true])) } };

const ref = () => db.collection("configuracion").doc("permisos");

// Caché corta: los permisos se consultan en cada escritura de catálogo.
let cache = null;
let cacheHasta = 0;

const normalizar = (datos = {}) => ({
    auditor: {
        catalogos: Object.fromEntries(
            CATALOGOS_CONFIGURABLES.map((c) => [c, datos.auditor?.catalogos?.[c] !== undefined ? datos.auditor.catalogos[c] === true : PREDETERMINADO.auditor.catalogos[c]])
        )
    }
});

export const obtenerPermisos = async () => {
    if (cache && Date.now() < cacheHasta) return cache;
    const doc = await ref().get();
    cache = { ...normalizar(doc.exists ? doc.data() : {}), actualizadoPor: doc.data()?.actualizadoPor || null, fechaActualizacion: doc.data()?.fechaActualizacion || null };
    cacheHasta = Date.now() + 30 * 1000;
    return cache;
};

export const guardarPermisos = async (datos, usuario) => {
    const catalogos = datos?.auditor?.catalogos;
    if (!catalogos || typeof catalogos !== "object") throw new ErrorHttp(400, "Formato de permisos no válido.");
    const actual = await obtenerPermisos();
    const nuevos = normalizar({ auditor: { catalogos: { ...actual.auditor.catalogos, ...catalogos } } });
    const completo = { ...nuevos, actualizadoPor: usuario.name || usuario.email || null, fechaActualizacion: new Date().toISOString() };
    await ref().set(completo);
    cache = completo;
    cacheHasta = Date.now() + 30 * 1000;
    return completo;
};

// ¿Puede este usuario crear/editar/eliminar en este catálogo?
export const puedeEditarCatalogo = async (usuario, catalogo) => {
    if ([ROLES.ADMIN, ROLES.INVENTARIO].includes(usuario?.role)) return true;
    if (usuario?.role !== ROLES.AUDITOR) return false;
    const permisos = await obtenerPermisos();
    return permisos.auditor.catalogos[catalogo] === true;
};

// Mapa { catalogo: bool } del usuario (lo usa /auth/me para el frontend).
export const permisosCatalogosDe = async (usuario) =>
    Object.fromEntries(await Promise.all(CATALOGOS_CONFIGURABLES.map(async (c) => [c, await puedeEditarCatalogo(usuario, c)])));
