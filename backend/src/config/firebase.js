// Configuración de Firebase Admin (backend). Exporta `db` como default y `{ db, auth }` con nombre.
//
// De dónde salen las credenciales (en este orden):
//   1. FIREBASE_SERVICE_ACCOUNT  → el JSON completo de la cuenta de servicio, pegado
//      como variable de entorno (Render → Environment). También acepta el JSON en base64.
//   2. FIREBASE_CREDENTIALS_PATH → ruta a un archivo (ej. Secret File de Render:
//      /etc/secrets/firebase-key.json).
//   3. /etc/secrets/firebase-key.json (Secret File de Render, si existe).
//   4. backend/credentials/firebase-key.json (desarrollo local, como hasta ahora).
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";

const leerCredenciales = () => {
    const env = process.env.FIREBASE_SERVICE_ACCOUNT?.trim();
    if (env) {
        const texto = env.startsWith("{") ? env : Buffer.from(env, "base64").toString("utf8");
        const json = JSON.parse(texto);
        // Algunos paneles guardan los saltos de línea de la llave como "\n" literal.
        if (json.private_key) json.private_key = json.private_key.replace(/\\n/g, "\n");
        return json;
    }
    const rutas = [
        process.env.FIREBASE_CREDENTIALS_PATH,
        "/etc/secrets/firebase-key.json",
        fileURLToPath(new URL("../../credentials/firebase-key.json", import.meta.url))
    ].filter(Boolean);
    const ruta = rutas.find((r) => existsSync(r));
    if (!ruta) {
        throw new Error("No se encontraron las credenciales de Firebase. Define FIREBASE_SERVICE_ACCOUNT o coloca backend/credentials/firebase-key.json.");
    }
    return JSON.parse(readFileSync(ruta, "utf8"));
};

const app = getApps().length === 0
    ? initializeApp({ credential: cert(leerCredenciales()) })
    : getApps()[0];

const db = getFirestore(app);
const auth = getAuth(app);

export { db, auth };
export default db;
