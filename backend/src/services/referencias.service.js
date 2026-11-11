import db from "../config/firebase.js";
import { ErrorHttp } from "../utils/errores.js";

const leer = async (coleccion, id) => {
    if (!id) return null;
    const doc = await db.collection(coleccion).doc(id).get();
    return doc.exists ? { id: doc.id, ...doc.data() } : null;
};

// Valida y resuelve los ids de catálogo a { id, nombre } para guardar el
// nombre junto al id (el activo se lista sin consultas extra).
export const resolverReferencias = async ({ tipoId, sucursalId, areaId, responsableId } = {}) => {
    const [tipo, sucursal, area, responsable] = await Promise.all([
        tipoId !== undefined ? leer("tiposActivo", tipoId) : undefined,
        sucursalId !== undefined ? leer("sucursales", sucursalId) : undefined,
        areaId !== undefined ? leer("areas", areaId) : undefined,
        responsableId !== undefined ? leer("asociados", responsableId) : undefined
    ]);
    if (tipoId && !tipo) throw new ErrorHttp(400, "El tipo de activo seleccionado no existe.");
    if (sucursalId && !sucursal) throw new ErrorHttp(400, "La sucursal seleccionada no existe.");
    if (areaId && !area) throw new ErrorHttp(400, "El área seleccionada no existe.");
    if (responsableId && !responsable) throw new ErrorHttp(400, "El asociado seleccionado no existe.");
    return { tipo, sucursal, area, responsable };
};
