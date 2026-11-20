import express from "express";
import { verPermisos, actualizarPermisos } from "../controllers/configuracion.controller.js";
import { verifyRoles } from "../middlewares/auth.middleware.js";
import { ROLES } from "../config/roles.js";

const router = express.Router();

router.get("/permisos", verPermisos);
// Solo el Administrador cambia los permisos.
router.put("/permisos", verifyRoles(ROLES.ADMIN), actualizarPermisos);

export default router;
