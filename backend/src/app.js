import express from "express";
import { sensorAssetPro } from "./sensor/assetpro-sensor.js";
import cors from "cors";

import authRoutes from "./routes/auth.routes.js";
import usersRoutes from "./routes/users.routes.js";
import catalogosRoutes from "./routes/catalogos.routes.js";
import activosRoutes from "./routes/activos.routes.js";
import movimientosRoutes from "./routes/movimientos.routes.js";
import levantamientosRoutes from "./routes/levantamientos.routes.js";
import notificacionesRoutes from "./routes/notificaciones.routes.js";
import programacionRoutes, { ubicacionRouter } from "./routes/programacion.routes.js";
import configuracionRoutes from "./routes/configuracion.routes.js";

import { verifyToken } from "./middlewares/auth.middleware.js";

const app = express();

// ASSET PRO CONSOLE: telemetría y seguridad (opcional). Sin CONSOLE_URL en .env no hace nada.
app.use(sensorAssetPro({ url: process.env.CONSOLE_URL, appId: "fixed-assets", key: process.env.CONSOLE_SENSOR_KEY }));

// CORS: FRONTEND_URL admite varias URLs separadas por coma
// (ej. "https://asset-pro-fixed-assets.vercel.app,http://localhost:3001").
// CORS_VERCEL_PREVIEWS=true permite también las vistas previas *.vercel.app del proyecto.
const ORIGENES = (process.env.FRONTEND_URL || "").split(",").map((u) => u.trim().replace(/\/$/, "")).filter(Boolean);
const permitirOrigen = (origin, cb) => {
    if (!origin || ORIGENES.length === 0 || ORIGENES.includes(origin)) return cb(null, true);
    if (process.env.CORS_VERCEL_PREVIEWS === "true" && /^https:\/\/[a-z0-9-]+\.vercel\.app$/.test(origin)) return cb(null, true);
    return cb(null, false);
};

// Render (y otros PaaS) ponen un proxy delante: así req.ip es la IP real.
app.set("trust proxy", 1);

app.use(cors({
    origin: permitirOrigen,
    // Content-Disposition trae el nombre del Excel y del acta en PDF.
    exposedHeaders: ["Content-Disposition"]
}));
// Las fotos de los activos viajan como JPEG comprimido en base64.
app.use(express.json({ limit: "4mb" }));

// Todas las rutas requieren sesión. No hay auto-registro: los usuarios
// los crea un Administrador desde /usuarios (o el script de seed).
app.use("/api/auth", verifyToken, authRoutes);
app.use("/api/users", verifyToken, usersRoutes);
app.use("/api/catalogos", verifyToken, catalogosRoutes);
app.use("/api/activos", verifyToken, activosRoutes);
app.use("/api/movimientos", verifyToken, movimientosRoutes);
app.use("/api/levantamientos", verifyToken, levantamientosRoutes);
app.use("/api/notificaciones", verifyToken, notificacionesRoutes);
app.use("/api/programacion", verifyToken, programacionRoutes);
app.use("/api/ubicacion", verifyToken, ubicacionRouter);
app.use("/api/configuracion", verifyToken, configuracionRoutes);

// Health check para Render.
app.get("/health", (req, res) => res.json({ ok: true }));

app.get("/", (req, res) => {
    res.json({ mensaje: "ASSET PRO - Fixed Assets API funcionando" });
});

app.use((err, req, res, next) => {
    if (err?.type === "entity.too.large") {
        return res.status(400).json({ ok: false, message: "La información enviada es demasiado grande (revisa el tamaño de la foto)." });
    }
    if (err?.status) {
        return res.status(err.status).json({ ok: false, message: err.message });
    }
    console.error(err);
    res.status(500).json({ ok: false, message: "Error interno del servidor.", error: err?.message });
});

export default app;
