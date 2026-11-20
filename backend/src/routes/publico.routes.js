import express from "express";
import { leerActivo } from "../services/activos.service.js";
import { manejar } from "../utils/errores.js";

// Rutas PÚBLICAS (sin sesión): solo la ficha de un activo, que se abre al
// escanear su etiqueta QR. Devuelve un subconjunto fijo de campos de solo
// lectura: nada financiero, ni historial, ni datos internos.
const router = express.Router();

// Límite simple por IP (protege contra barridos automáticos).
const VENTANA_MS = 60 * 1000;
const MAX_POR_VENTANA = 60;
const visitas = new Map();
const limitar = (req, res, next) => {
    const ahora = Date.now();
    const ip = req.ip || "desconocida";
    const v = visitas.get(ip);
    if (!v || ahora - v.inicio > VENTANA_MS) {
        visitas.set(ip, { inicio: ahora, n: 1 });
    } else if (++v.n > MAX_POR_VENTANA) {
        return res.status(429).json({ ok: false, message: "Demasiadas consultas. Intenta en un minuto." });
    }
    if (visitas.size > 5000) for (const [k, x] of visitas) if (ahora - x.inicio > VENTANA_MS) visitas.delete(k);
    next();
};

const fichaPublica = (a) => ({
    codigo: a.codigo,
    idActivo: a.idActivo,
    descripcion: a.descripcion || "",
    tipo: a.tipoNombre || "",
    marca: a.marca || "",
    modelo: a.modelo || "",
    serie: a.serie || "",
    estado: a.estado,
    condicion: a.condicion || null,
    sucursal: a.sucursalNombre || "",
    area: a.areaNombre || "",
    ubicacion: a.ubicacion || "",
    responsable: a.responsableNombre || "",
    foto: a.foto || null,
    noLocalizado: a.noLocalizado === true,
    ultimaAuditoria: a.ultimaAuditoria?.fecha ? { fecha: a.ultimaAuditoria.fecha, encontrado: a.ultimaAuditoria.encontrado !== false } : null
});

// GET /api/publico/activos/:id
router.get("/activos/:id", limitar, manejar(async (req, res) => {
    res.set("Cache-Control", "no-store");
    res.set("X-Robots-Tag", "noindex, nofollow");
    const activo = await leerActivo(req.params.id);
    if (!activo) return res.status(404).json({ ok: false, message: "No encontramos este activo. Verifica la etiqueta." });
    res.json({ ok: true, data: fichaPublica(activo) });
}));

export default router;
