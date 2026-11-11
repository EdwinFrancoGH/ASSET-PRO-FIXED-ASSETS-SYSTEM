import express from "express";
import * as c from "../controllers/levantamientos.controller.js";
import { verifyRoles } from "../middlewares/auth.middleware.js";
import { ROLES_LEVANTAMIENTO } from "../config/roles.js";

const router = express.Router();
const LEVANTA = verifyRoles(ROLES_LEVANTAMIENTO);

router.get("/", c.listar);
router.post("/", LEVANTA, c.crear);
router.get("/:id", c.obtener);
router.get("/:id/acta", c.acta);
router.put("/:id", LEVANTA, c.guardar);
router.post("/:id/cerrar", LEVANTA, c.cerrar);
router.delete("/:id", LEVANTA, c.eliminar);

export default router;
