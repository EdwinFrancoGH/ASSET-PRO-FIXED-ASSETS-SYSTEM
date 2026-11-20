import express from "express";
import * as c from "../controllers/activos.controller.js";
import { verifyRoles } from "../middlewares/auth.middleware.js";
import { ROLES_GESTION } from "../config/roles.js";
import { requierePermiso } from "../services/permisos.service.js";

const router = express.Router();
const GESTION = verifyRoles(ROLES_GESTION);

// Rutas fijas antes de /:id
router.get("/resumen", c.resumen);
router.get("/exportar", c.exportar);

router.get("/", c.listar);
router.post("/", GESTION, c.crear);
router.get("/:id", c.obtener);
// Editar y registrar movimientos: Admin/Inventario siempre; Auditor según
// los permisos que le dé el Administrador (Catálogos → Permisos del auditor).
router.put("/:id", requierePermiso("activos", "editar"), c.actualizar);
router.delete("/:id", GESTION, c.eliminar);
router.post("/:id/movimientos", requierePermiso("activos", "movimientos"), c.movimiento);

export default router;
