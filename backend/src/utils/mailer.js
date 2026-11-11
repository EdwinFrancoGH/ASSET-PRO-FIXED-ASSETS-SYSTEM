import nodemailer from "nodemailer";

// Si SMTP no está configurado, el sistema sigue funcionando: las
// notificaciones se guardan en la app y solo se omite el correo.
let transportadorCache;

function obtenerTransportador() {
    if (transportadorCache !== undefined) return transportadorCache;

    const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;
    if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
        transportadorCache = null;
        return transportadorCache;
    }

    const puerto = Number(SMTP_PORT) || 587;
    transportadorCache = nodemailer.createTransport({
        host: SMTP_HOST,
        port: puerto,
        secure: puerto === 465,
        auth: { user: SMTP_USER, pass: SMTP_PASS },
        connectionTimeout: 10000,
        greetingTimeout: 10000,
        socketTimeout: 20000
    });
    return transportadorCache;
}

const escapar = (texto = "") =>
    String(texto).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

export function construirHtmlAviso({ titulo, mensaje, enlace }) {
    return `
        <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;color:#1c1917;">
            <div style="background:#1c0a0a;color:#fff;padding:20px 24px;border-radius:12px 12px 0 0;">
                <div style="font-size:18px;font-weight:bold;">ASSET PRO <span style="color:#f87171;">FIXED ASSETS</span></div>
                <div style="font-size:13px;color:#e7e5e4;">Control de activos fijos</div>
            </div>
            <div style="border:1px solid #e7e5e4;border-top:none;padding:24px;border-radius:0 0 12px 12px;">
                <h2 style="margin:0 0 8px;font-size:18px;color:#1c1917;">${escapar(titulo)}</h2>
                <p style="margin:0 0 16px;line-height:1.5;">${escapar(mensaje)}</p>
                ${enlace ? `<a href="${enlace}" style="display:inline-block;background:#dc2626;color:#fff;text-decoration:none;padding:12px 20px;border-radius:8px;font-weight:bold;">Ver en ASSET PRO</a>` : ""}
                <p style="font-size:12px;color:#a8a29e;margin-top:24px;">Correo automático de ASSET PRO Fixed Assets. No respondas a este mensaje.</p>
            </div>
        </div>`;
}

// Nunca lanza: un fallo de correo no revierte la operación ya guardada.
export const enviarCorreo = async ({ para, asunto, html }) => {
    const destinatarios = (Array.isArray(para) ? para : [para]).filter(Boolean);
    if (destinatarios.length === 0) return { enviado: false, motivo: "SIN_CORREO" };

    const transportador = obtenerTransportador();
    if (!transportador) {
        console.warn("[mailer] SMTP no configurado — se omitió el correo:", asunto);
        return { enviado: false, motivo: "SMTP_NO_CONFIGURADO" };
    }

    try {
        await transportador.sendMail({ from: process.env.SMTP_FROM || process.env.SMTP_USER, to: destinatarios.join(","), subject: asunto, html });
        return { enviado: true };
    } catch (error) {
        console.error("[mailer] Error enviando correo:", error.message);
        return { enviado: false, motivo: "ERROR_ENVIO", detalle: error.message };
    }
};
