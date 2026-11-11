// =====================================================================
// ASSET PRO SENSOR — telemetría y seguridad para apps Express
// Archivo independiente (sin dependencias, Node 18+). OPCIONAL.
//
// Mide: peticiones por minuto, latencia (p50/p95/máx) por ruta, errores
// 4xx/5xx, errores del servidor (console.error) y ataques: fuerza bruta,
// escaneos de rutas sensibles, intentos de inyección y tráfico anómalo.
// Cada minuto envía un resumen a ASSET PRO CONSOLE. Si la consola no
// responde, descarta el lote: nunca bloquea ni cambia las respuestas de la app.
//
// Uso (2 líneas en app.js, justo después de "const app = express();"):
//   import { sensorAssetPro } from "./sensor/assetpro-sensor.js";
//   app.use(sensorAssetPro({ url: process.env.CONSOLE_URL, appId: "pay", key: process.env.CONSOLE_SENSOR_KEY }));
// Sin CONSOLE_URL o sin key, el sensor no hace nada.
// =====================================================================

const PATRONES = [
    { tipo: "Escaneo de rutas sensibles", severidad: "Alta", re: /(\.env\b|\.git\/|wp-admin|wp-login|xmlrpc|phpmyadmin|\/etc\/passwd|cgi-bin|\.php\b|\.asp\b|\/actuator|\/server-status)/i },
    { tipo: "Path traversal", severidad: "Alta", re: /(\.\.\/|\.\.\\|%2e%2e%2f|%2e%2e\/)/i },
    { tipo: "Intento de inyección SQL", severidad: "Alta", re: /(union(\s|%20|\+)+select|'\s*or\s*'?1'?\s*=\s*'?1|;\s*drop\s+table|sleep\(\d+\)|benchmark\()/i },
    { tipo: "Intento de XSS", severidad: "Media", re: /(<script|%3cscript|javascript:|onerror\s*=|onload\s*=)/i },
    { tipo: "Intento de inyección NoSQL", severidad: "Alta", re: /("\$where"|"\$ne"|"\$gt"|"\$regex"|\[\$ne\]|\[\$gt\])/i }
];

const normalizarRuta = (url = "") => {
    const ruta = url.split("?")[0];
    return ruta.split("/").map((s) => (s && (/\d/.test(s) || s.length >= 20) ? ":id" : s)).join("/").slice(0, 120) || "/";
};

const pct = (lista, p) => {
    if (!lista.length) return null;
    const v = [...lista].sort((a, b) => a - b);
    return Math.round(v[Math.min(v.length - 1, Math.max(0, Math.ceil((p / 100) * v.length) - 1))]);
};

export function sensorAssetPro({ url, appId, key, intervaloSeg = 60, capturarConsola = true, enviar = null, umbralFallos = 15, umbralTrafico = 600 } = {}) {
    const activo = Boolean(enviar || (url && appId && key));
    if (!activo) return (req, res, next) => next();

    const nuevo = () => ({ desde: new Date().toISOString(), total: 0, s2xx: 0, s3xx: 0, s4xx: 0, s5xx: 0, ms: [], rutas: new Map(), ips: new Map(), errores: [], seguridad: [], vistos: new Set() });
    let lote = nuevo();

    // Un evento por IP y tipo en cada lote (evita inundar la consola).
    const evento = (tipo, severidad, ip, ruta, detalle, l = lote) => {
        const k = `${tipo}|${ip}`;
        if (l.vistos.has(k) || l.seguridad.length >= 50) return;
        l.vistos.add(k);
        l.seguridad.push({ fecha: new Date().toISOString(), tipo, severidad, ip, ruta, detalle });
    };

    // Captura de errores del servidor sin cambiar el comportamiento de console.error.
    if (capturarConsola && !console.error.__assetpro) {
        const original = console.error.bind(console);
        const envuelto = (...args) => {
            try {
                const err = args.find((a) => a instanceof Error);
                if (lote.errores.length < 50) {
                    lote.errores.push({
                        fecha: new Date().toISOString(),
                        mensaje: err ? err.message : args.map((a) => (typeof a === "string" ? a : JSON.stringify(a))).join(" ").slice(0, 500),
                        stack: err?.stack || null
                    });
                }
            } catch { /* nunca interrumpir */ }
            original(...args);
        };
        envuelto.__assetpro = true;
        console.error = envuelto;
    }

    const flush = async () => {
        const l = lote;
        lote = nuevo();
        // Análisis por IP: fuerza bruta y tráfico anómalo.
        for (const [ip, d] of l.ips) {
            if (d.fallos >= umbralFallos) evento("Posible fuerza bruta", "Crítica", ip, d.ultimaRuta, `${d.fallos} respuestas 401/403 en ${intervaloSeg} s`, l);
            if (d.n >= umbralTrafico) evento("Tráfico anómalo (posible DoS)", "Alta", ip, d.ultimaRuta, `${d.n} peticiones en ${intervaloSeg} s`, l);
        }
        if (!l.total && !l.errores.length && !l.seguridad.length) return;
        const rutas = [...l.rutas.entries()].map(([ruta, r]) => ({ ruta, n: r.n, err: r.err, promedio: Math.round(r.suma / r.n), max: r.max }))
            .sort((a, b) => b.n - a.n).slice(0, 40);
        const payload = {
            desde: l.desde, hasta: new Date().toISOString(),
            resumen: { total: l.total, s2xx: l.s2xx, s3xx: l.s3xx, s4xx: l.s4xx, s5xx: l.s5xx, p50: pct(l.ms, 50), p95: pct(l.ms, 95), max: l.ms.length ? Math.round(Math.max(...l.ms)) : null, promedio: l.ms.length ? Math.round(l.ms.reduce((s, n) => s + n, 0) / l.ms.length) : null, rutas },
            errores: l.errores, seguridad: l.seguridad
        };
        try {
            if (enviar) await enviar(payload);
            else await fetch(`${url.replace(/\/+$/, "")}/api/ingest/${appId}`, {
                method: "POST", headers: { "Content-Type": "application/json", "x-sensor-key": key },
                body: JSON.stringify(payload), signal: AbortSignal.timeout(8000)
            });
        } catch { /* consola no disponible: se descarta el lote */ }
    };
    const timer = setInterval(flush, intervaloSeg * 1000);
    timer.unref?.();

    return function sensor(req, res, next) {
        const inicio = process.hrtime.bigint();
        const ip = (req.headers["x-forwarded-for"] || "").split(",")[0].trim() || req.socket?.remoteAddress || "desconocida";
        const urlCruda = req.originalUrl || req.url || "";
        let decodificada = urlCruda;
        try { decodificada = decodeURIComponent(urlCruda); } catch { /* url mal formada */ }
        for (const p of PATRONES) if (p.re.test(urlCruda) || p.re.test(decodificada)) evento(p.tipo, p.severidad, ip, urlCruda.slice(0, 300), "Detectado en la URL");

        res.on("finish", () => {
            try {
                const ms = Number(process.hrtime.bigint() - inicio) / 1e6;
                const s = res.statusCode;
                // Rutas inexistentes (escáneres) se agrupan para no inflar el reporte.
                const ruta = !req.route && s === 404 ? `${req.method} (ruta inexistente)`
                    : `${req.method} ${normalizarRuta((req.baseUrl || "") + (req.route?.path || req.path || urlCruda))}`;
                lote.total++;
                if (s >= 500) lote.s5xx++; else if (s >= 400) lote.s4xx++; else if (s >= 300) lote.s3xx++; else lote.s2xx++;
                if (lote.ms.length < 5000) lote.ms.push(ms);
                const r = lote.rutas.get(ruta) || { n: 0, err: 0, suma: 0, max: 0 };
                r.n++; r.suma += ms; r.max = Math.max(r.max, Math.round(ms)); if (s >= 500) r.err++;
                if (lote.rutas.size < 300 || lote.rutas.has(ruta)) lote.rutas.set(ruta, r);
                const d = lote.ips.get(ip) || { n: 0, fallos: 0, ultimaRuta: null };
                d.n++; d.ultimaRuta = ruta; if (s === 401 || s === 403) d.fallos++;
                if (lote.ips.size < 5000 || lote.ips.has(ip)) lote.ips.set(ip, d);
                if (s >= 500 && lote.errores.length < 50) lote.errores.push({ fecha: new Date().toISOString(), mensaje: `HTTP ${s} en ${ruta}`, ruta, metodo: req.method, status: s });
                if (req.body && typeof req.body === "object") {
                    const cuerpo = JSON.stringify(req.body).slice(0, 5000);
                    for (const p of PATRONES) if (p.tipo !== "Escaneo de rutas sensibles" && p.re.test(cuerpo)) evento(p.tipo, p.severidad, ip, ruta, "Detectado en el cuerpo de la petición");
                }
            } catch { /* nunca interrumpir */ }
        });
        next();
    };
}

export default sensorAssetPro;
