import { auth, db } from "../config/firebase.js";

// Verifica el token de Firebase y carga el documento del usuario (rol,
// nombre, activo) en req.usuario.
export const verifyToken = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return res.status(401).json({ ok: false, message: "Token no proporcionado o formato inválido." });
        }

        const token = authHeader.split("Bearer ")[1];
        const decodedToken = await auth.verifyIdToken(token);
        req.user = decodedToken;

        const userDoc = await db.collection("usuarios").doc(decodedToken.uid).get();

        if (!userDoc.exists) {
            return res.status(403).json({ ok: false, message: "Tu usuario no está registrado en el sistema. Contacta al administrador." });
        }

        const datos = userDoc.data();

        if (datos.activo === false) {
            return res.status(403).json({ ok: false, message: "Tu usuario está desactivado. Contacta al administrador." });
        }

        req.usuario = { uid: userDoc.id, ...datos };
        next();
    } catch (error) {
        console.error("Error verificando token:", error.message);
        return res.status(401).json({ ok: false, message: "Token inválido o expirado." });
    }
};

// Autorización por rol. Se usa después de verifyToken:
// verifyRoles("Administrador", "Responsable inventario")
export const verifyRoles = (...rolesPermitidos) => (req, res, next) => {
    const lista = rolesPermitidos.flat();
    if (!req.usuario || !lista.includes(req.usuario.role)) {
        return res.status(403).json({ ok: false, message: "No tienes permisos para realizar esta acción." });
    }
    next();
};
