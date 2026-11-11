import * as s from "../services/activos.service.js";
import { registrar as registrarMovimiento } from "../services/movimientos.service.js";
import { excelActivos } from "../services/exportar.service.js";
import { manejar } from "../utils/errores.js";

export const listar = manejar(async (req, res) => {
    res.json({ ok: true, data: await s.listar(req.query) });
});

export const resumen = manejar(async (req, res) => {
    res.json({ ok: true, data: await s.resumen() });
});

export const exportar = manejar(async (req, res) => {
    const activos = await s.listar(req.query);
    const buffer = await excelActivos(activos, { generadoPor: req.usuario.name });
    const nombre = `consolidado-activos-${new Date().toISOString().slice(0, 10)}.xlsx`;
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename="${nombre}"`);
    res.send(Buffer.from(buffer));
});

export const obtener = manejar(async (req, res) => {
    res.json({ ok: true, data: await s.obtener(req.params.id) });
});

export const crear = manejar(async (req, res) => {
    const data = await s.crear(req.body, req.usuario);
    res.status(201).json({ ok: true, message: `Activo ${data.codigo} registrado.`, data });
});

export const actualizar = manejar(async (req, res) => {
    const data = await s.actualizar(req.params.id, req.body, req.usuario);
    res.json({ ok: true, message: "Activo actualizado.", data });
});

export const eliminar = manejar(async (req, res) => {
    await s.eliminar(req.params.id, req.usuario);
    res.json({ ok: true, message: "Activo eliminado." });
});

export const movimiento = manejar(async (req, res) => {
    const data = await registrarMovimiento(req.params.id, req.body, req.usuario);
    res.status(201).json({ ok: true, message: `Movimiento ${data.numero} registrado.`, data });
});
