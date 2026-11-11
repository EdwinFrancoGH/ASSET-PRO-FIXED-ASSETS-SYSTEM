import express from "express";
import { listar, crearRegistro, actualizarRegistro, eliminarRegistro, registrarAsociado } from "../controllers/catalogos.controller.js";
import { verifyRoles } from "../middlewares/auth.middleware.js";
import { ROLES_GESTION, ROLES_LEVANTAMIENTO } from "../config/roles.js";

const router = express.Router();

// Cualquier usuario autenticado puede leer (los necesitan los formularios).
router.get("/:catalogo", listar);

// Quien hace levantamientos puede agregar un asociado al vuelo.
router.post("/asociados/registro", verifyRoles(ROLES_LEVANTAMIENTO), registrarAsociado);

// Solo Administrador y Responsable inventario mantienen los catálogos.
const GESTION = verifyRoles(ROLES_GESTION);
router.post("/:catalogo", GESTION, crearRegistro);
router.put("/:catalogo/:id", GESTION, actualizarRegistro);
router.delete("/:catalogo/:id", GESTION, eliminarRegistro);

export default router;
