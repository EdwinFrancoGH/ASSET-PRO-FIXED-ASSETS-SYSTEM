import { CATALOGOS, NOMBRES, obtenerTodos, crear, actualizar, eliminar } from "../services/catalogos.service.js";
import { validarCatalogo } from "../validators/catalogo.validator.js";
import { manejar } from "../utils/errores.js";

const catalogoValido = (req, res) => {
    const { catalogo } = req.params;
    if (!CATALOGOS[catalogo]) {
        res.status(404).json({ ok: false, message: "Catálogo no encontrado." });
        return null;
    }
    return catalogo;
};

// GET /api/catalogos/:catalogo?activos=true
export const listar = manejar(async (req, res) => {
    const catalogo = catalogoValido(req, res);
    if (!catalogo) return;
    res.json({ ok: true, data: await obtenerTodos(catalogo, { soloActivos: req.query.activos === "true" }) });
});

export const crearRegistro = manejar(async (req, res) => {
    const catalogo = catalogoValido(req, res);
    if (!catalogo) return;
    const error = validarCatalogo(catalogo, req.body);
    if (error) return res.status(400).json({ ok: false, message: error });
    const data = await crear(catalogo, req.body, req.usuario);
    res.status(201).json({ ok: true, message: `${NOMBRES[catalogo]} creado correctamente.`, data });
});

export const actualizarRegistro = manejar(async (req, res) => {
    const catalogo = catalogoValido(req, res);
    if (!catalogo) return;
    const error = validarCatalogo(catalogo, req.body);
    if (error) return res.status(400).json({ ok: false, message: error });
    const data = await actualizar(catalogo, req.params.id, req.body);
    if (!data) return res.status(404).json({ ok: false, message: `${NOMBRES[catalogo]} no encontrado.` });
    res.json({ ok: true, message: `${NOMBRES[catalogo]} actualizado correctamente.`, data });
});

export const eliminarRegistro = manejar(async (req, res) => {
    const catalogo = catalogoValido(req, res);
    if (!catalogo) return;
    const eliminado = await eliminar(catalogo, req.params.id);
    if (!eliminado) return res.status(404).json({ ok: false, message: `${NOMBRES[catalogo]} no encontrado.` });
    res.json({ ok: true, message: `${NOMBRES[catalogo]} eliminado correctamente.` });
});

// POST /api/catalogos/asociados/registro — el Auditor puede registrar un
// asociado nuevo desde el levantamiento (botón "Nuevo asociado" del Excel).
export const registrarAsociado = manejar(async (req, res) => {
    const error = validarCatalogo("asociados", req.body);
    if (error) return res.status(400).json({ ok: false, message: error });
    const data = await crear("asociados", { ...req.body, activo: true }, req.usuario);
    res.status(201).json({ ok: true, message: "Asociado agregado correctamente.", data });
});
