import db from "../config/firebase.js";
import { enviarCorreo, construirHtmlAviso } from "../utils/mailer.js";

const COLECCION = "notificaciones";

export const obtenerUsuariosPorRol = async (...roles) => {
    const snapshot = await db.collection("usuarios").where("role", "in", roles.flat()).get();
    return snapshot.docs.map((doc) => ({ uid: doc.id, ...doc.data() })).filter((u) => u.activo !== false);
};

const enviarCorreos = async ({ ids, titulo, mensaje, enlace }) => {
    try {
        const usuarios = await Promise.all(ids.map((id) => db.collection("usuarios").doc(id).get()));
        const correos = [...new Set(usuarios.filter((d) => d.exists).map((d) => d.data().email).filter(Boolean))];
        if (correos.length === 0) return;

        const baseUrl = (process.env.FRONTEND_URL || "http://localhost:3100").split(",")[0].trim().replace(/\/+$/, "");
        const asunto = `ASSET PRO Fixed Assets · ${titulo}`;
        const html = construirHtmlAviso({ titulo, mensaje, enlace: enlace ? `${baseUrl}${enlace}` : null });
        await Promise.all(correos.map((para) => enviarCorreo({ para, asunto, html })));
    } catch (error) {
        console.error("[notificaciones] No se pudieron enviar los correos:", error.message);
    }
};

// Guarda el aviso en la campana de cada usuario y lo envía por correo en
// segundo plano. Nunca lanza.
export const notificar = async ({ usuarioIds, titulo, mensaje, enlace = null, excluir = null }) => {
    try {
        const ids = [...new Set((usuarioIds || []).filter((id) => id && id !== excluir))];
        if (ids.length === 0) return;

        const fecha = new Date().toISOString();
        for (let i = 0; i < ids.length; i += 450) {
            const batch = db.batch();
            ids.slice(i, i + 450).forEach((usuarioId) => {
                batch.set(db.collection(COLECCION).doc(), { usuarioId, titulo, mensaje, enlace, leida: false, fecha });
            });
            await batch.commit();
        }
        enviarCorreos({ ids, titulo, mensaje, enlace });
    } catch (error) {
        console.error("[notificaciones] No se pudo notificar:", error.message);
    }
};

export const obtenerDeUsuario = async (usuarioId, limite = 50) => {
    const snapshot = await db.collection(COLECCION).where("usuarioId", "==", usuarioId).get();
    const todas = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })).sort((a, b) => b.fecha.localeCompare(a.fecha));
    return { noLeidas: todas.filter((n) => !n.leida).length, notificaciones: todas.slice(0, limite) };
};

export const marcarLeida = async (usuarioId, id) => {
    const ref = db.collection(COLECCION).doc(id);
    const doc = await ref.get();
    if (!doc.exists || doc.data().usuarioId !== usuarioId) return false;
    await ref.update({ leida: true });
    return true;
};

export const marcarTodasLeidas = async (usuarioId) => {
    const snapshot = await db.collection(COLECCION).where("usuarioId", "==", usuarioId).where("leida", "==", false).get();
    for (let i = 0; i < snapshot.docs.length; i += 450) {
        const batch = db.batch();
        snapshot.docs.slice(i, i + 450).forEach((doc) => batch.update(doc.ref, { leida: true }));
        await batch.commit();
    }
    return snapshot.size;
};
