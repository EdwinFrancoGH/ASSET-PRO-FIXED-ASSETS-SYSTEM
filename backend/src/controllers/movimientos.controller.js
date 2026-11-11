import { listar as listarMovs } from "../services/movimientos.service.js";
import { excelMovimientos } from "../services/exportar.service.js";
import { manejar } from "../utils/errores.js";

export const listar = manejar(async (req, res) => {
    res.json({ ok: true, data: await listarMovs(req.query) });
});

export const exportar = manejar(async (req, res) => {
    const movimientos = await listarMovs(req.query);
    const buffer = await excelMovimientos(movimientos, { generadoPor: req.usuario.name });
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename="movimientos-activos-${new Date().toISOString().slice(0, 10)}.xlsx"`);
    res.send(Buffer.from(buffer));
});
