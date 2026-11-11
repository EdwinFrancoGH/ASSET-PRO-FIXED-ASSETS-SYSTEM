import express from "express";
import * as c from "../controllers/activos.controller.js";
import { verifyRoles } from "../middlewares/auth.middleware.js";
import { ROLES_GESTION } from "../config/roles.js";

const router = express.Router();
const GESTION = verifyRoles(ROLES_GESTION);

// Rutas fijas antes de /:id
router.get("/resumen", c.resumen);
router.get("/exportar", c.exportar);

router.get("/", c.listar);
router.post("/", GESTION, c.crear);
router.get("/:id", c.obtener);
router.put("/:id", GESTION, c.actualizar);
router.delete("/:id", GESTION, c.eliminar);
router.post("/:id/movimientos", GESTION, c.movimiento);

export default router;
