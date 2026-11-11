import express from "express";
import { listar, exportar } from "../controllers/movimientos.controller.js";

// Los movimientos se registran desde el activo: POST /api/activos/:id/movimientos
const router = express.Router();

router.get("/exportar", exportar);
router.get("/", listar);

export default router;
