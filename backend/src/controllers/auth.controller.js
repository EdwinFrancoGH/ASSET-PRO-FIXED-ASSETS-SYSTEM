import { manejar } from "../utils/errores.js";
import { permisosDe } from "../services/permisos.service.js";

// GET /api/auth/me — datos del usuario logueado (rol, nombre y permisos). El
// frontend lo usa en AuthContext: Firestore queda con reglas cerradas y solo el
// backend (Firebase Admin) lee y escribe la base de datos.
export const me = manejar(async (req, res) => {
    const { uid, email, name, role, areaId, photoURL } = req.usuario;
    const permisos = await permisosDe(req.usuario);
    res.json({ ok: true, data: { uid, email, name, role, areaId: areaId || null, photoURL: photoURL || null, permisos } });
});
