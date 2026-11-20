import express from "express";
import { listar, crearRegistro, actualizarRegistro, eliminarRegistro, registrarAsociado } from "../controllers/catalogos.controller.js";
import { puedeEditarCatalogo } from "../services/permisos.service.js";

const router = express.Router();

// Escritura según permisos: Administrador y Responsable inventario siempre;
// Auditor solo en los catálogos que el Administrador le habilite
// (Catálogos → Permisos del auditor); Consulta nunca.
const permisoCatalogo = (catalogoFijo) => async (req, res, next) => {
    try {
        const catalogo = catalogoFijo || req.params.catalogo;
        if (await puedeEditarCatalogo(req.usuario, catalogo)) return next();
        return res.status(403).json({ ok: false, message: "No tienes permiso para modificar este catálogo. Pídelo al Administrador." });
    } catch (e) {
        next(e);
    }
};

// Cualquier usuario autenticado puede leer (los necesitan los formularios).
router.get("/:catalogo", listar);

// "Nuevo asociado" desde el levantamiento: sigue el permiso del catálogo Asociados.
router.post("/asociados/registro", permisoCatalogo("asociados"), registrarAsociado);

router.post("/:catalogo", permisoCatalogo(), crearRegistro);
router.put("/:catalogo/:id", permisoCatalogo(), actualizarRegistro);
router.delete("/:catalogo/:id", permisoCatalogo(), eliminarRegistro);

export default router;
