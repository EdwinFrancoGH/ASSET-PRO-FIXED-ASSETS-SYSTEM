import * as s from "../services/programacion.service.js";
import { sucursalesCercanas } from "../services/ubicacion.service.js";
import { manejar } from "../utils/errores.js";

export const listar = manejar(async (req, res) => {
    res.json({ ok: true, data: await s.listar(req.usuario, req.query) });
});

export const hoy = manejar(async (req, res) => {
    res.json({ ok: true, data: await s.deHoy(req.usuario) });
});

export const crear = manejar(async (req, res) => {
    const data = await s.crear(req.body || {}, req.usuario);
    res.status(201).json({ ok: true, message: "Visita programada.", data });
});

export const actualizar = manejar(async (req, res) => {
    const data = await s.actualizar(req.params.id, req.body || {}, req.usuario);
    res.json({ ok: true, message: "Programación actualizada.", data });
});

export const realizada = manejar(async (req, res) => {
    const data = await s.marcarRealizada(req.params.id, req.body?.levantamientoId, req.usuario);
    res.json({ ok: true, message: "Visita marcada como realizada.", data });
});

export const eliminar = manejar(async (req, res) => {
    await s.eliminar(req.params.id, req.usuario);
    res.json({ ok: true, message: "Visita eliminada de la programación." });
});

export const copiarSemana = manejar(async (req, res) => {
    const data = await s.copiarSemana(req.body || {}, req.usuario);
    res.json({ ok: true, message: `${data.creadas} visita(s) copiadas${data.omitidas ? ` (${data.omitidas} ya existían)` : ""}.`, data });
});

// GET /api/ubicacion/cercanas?lat=..&lng=..&limite=5
export const cercanas = manejar(async (req, res) => {
    res.json({ ok: true, data: await sucursalesCercanas(req.query) });
});
