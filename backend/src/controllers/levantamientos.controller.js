import * as s from "../services/levantamientos.service.js";
import { generarActaPdf } from "../services/actaPdf.service.js";
import { manejar } from "../utils/errores.js";

export const listar = manejar(async (req, res) => {
    res.json({ ok: true, data: await s.listar(req.usuario, req.query) });
});

export const obtener = manejar(async (req, res) => {
    res.json({ ok: true, data: await s.leer(req.params.id, req.usuario) });
});

export const crear = manejar(async (req, res) => {
    const data = await s.crear(req.body, req.usuario);
    res.status(201).json({ ok: true, message: `Levantamiento ${data.numero} creado.`, data });
});

export const guardar = manejar(async (req, res) => {
    const data = await s.guardar(req.params.id, req.body, req.usuario);
    res.json({ ok: true, message: "Levantamiento guardado.", data });
});

export const cerrar = manejar(async (req, res) => {
    const data = await s.cerrar(req.params.id, req.body || {}, req.usuario);
    res.json({ ok: true, message: `Levantamiento ${data.numero} cerrado. El consolidado de activos quedó actualizado.`, data });
});

export const eliminar = manejar(async (req, res) => {
    await s.eliminar(req.params.id, req.usuario);
    res.json({ ok: true, message: "Levantamiento eliminado." });
});

// GET /api/levantamientos/:id/acta?responsable=Nombre → PDF
export const acta = manejar(async (req, res) => {
    const lev = await s.leer(req.params.id, req.usuario);
    const pdf = await generarActaPdf(lev, { responsableInventario: String(req.query.responsable || "").slice(0, 80) || req.usuario.name });
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `inline; filename="acta-${lev.numero}.pdf"`);
    res.send(pdf);
});
