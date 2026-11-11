import db from "../config/firebase.js";

// Correlativos sin repetirse (ACT-00001, MOV-00001, LEV-2026-0001, LAP-0001).
// Cada uno se incrementa en su propia transacción de Firestore; si la
// operación que lo usa falla después, el número simplemente se salta.
export const siguienteNumero = (clave) =>
    db.runTransaction(async (t) => {
        const ref = db.collection("contadores").doc(clave);
        const doc = await t.get(ref);
        const valor = (doc.exists ? doc.data().valor : 0) + 1;
        t.set(ref, { valor, actualizado: new Date().toISOString() });
        return valor;
    });

export const rellenar = (n, ancho) => String(n).padStart(ancho, "0");
