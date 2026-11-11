import express from "express";
import * as c from "../controllers/programacion.controller.js";
import { verifyRoles } from "../middlewares/auth.middleware.js";
import { ROLES_LEVANTAMIENTO } from "../config/roles.js";

// Programación de levantamientos: quienes hacen levantamientos
// (Administrador, Responsable inventario, Auditor). El service limita al
// Auditor a su propia programación.
const router = express.Router();
router.use(verifyRoles(ROLES_LEVANTAMIENTO));

router.get("/", c.listar);
router.get("/hoy", c.hoy);
router.post("/", c.crear);
router.post("/copiar-semana", c.copiarSemana);
router.put("/:id", c.actualizar);
router.patch("/:id/realizada", c.realizada);
router.delete("/:id", c.eliminar);

export default router;

// Sucursal más cercana: cualquier usuario autenticado.
export const ubicacionRouter = express.Router();
ubicacionRouter.get("/cercanas", c.cercanas);
