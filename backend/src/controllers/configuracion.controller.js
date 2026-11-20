import { obtenerPermisos, guardarPermisos } from "../services/permisos.service.js";
import { manejar } from "../utils/errores.js";

// GET /api/configuracion/permisos
export const verPermisos = manejar(async (req, res) => {
    res.json({ ok: true, data: await obtenerPermisos() });
});

// PUT /api/configuracion/permisos  { auditor: { catalogos: { asociados: false, ... } } }
export const actualizarPermisos = manejar(async (req, res) => {
    const data = await guardarPermisos(req.body, req.usuario);
    res.json({ ok: true, message: "Permisos actualizados.", data });
});
