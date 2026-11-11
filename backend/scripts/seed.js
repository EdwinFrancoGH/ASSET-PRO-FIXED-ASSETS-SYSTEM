// Prepara una base de datos nueva:
//   1. Crea el primer Administrador (no hay auto-registro).
//   2. Carga los catálogos iniciales del Excel FIXED ASSET KERNEL V1.2
//      (tipos de activo y sucursales) si están vacíos.
//
// Uso:
//   npm run seed -- admin@empresa.com "ContraseñaSegura" "Nombre Apellido"
import { auth, db } from "../src/config/firebase.js";
import { prefijoDeNombre } from "../src/config/activos.js";

const [email, password, name = "Administrador"] = process.argv.slice(2);

if (!email || !password) {
    console.error('Uso: npm run seed -- correo@empresa.com "contraseña" "Nombre"');
    process.exit(1);
}

// Hoja BD → NOMBRE_PERIFERICO (con vida útil sugerida en años)
const TIPOS = [
    ["MOUSE", 3], ["LAPTOP", 5], ["IMPRESORA", 5], ["ESCRITORIO", 10], ["AIRE ACONDICIONADO", 8],
    ["SERVIDOR", 6], ["PROYECTOR", 5], ["TELÉFONO IP", 4], ["CÁMARA", 5], ["SILLA", 8],
    ["UPS", 5], ["MONITOR", 5], ["ROUTER", 6]
];
// Hoja BD → SUCURSALES
const SUCURSALES = ["MEGA", "METRO 1", "METRO 2", "SAN MIGUEL 1", "SAN MIGUEL 2", "SONSONATE 1", "SONSONATE 2"];

const crearAdmin = async () => {
    let usuario;
    try {
        usuario = await auth.getUserByEmail(email);
        console.log(`• El usuario ${email} ya existía en Firebase Auth.`);
    } catch {
        usuario = await auth.createUser({ email, password, displayName: name });
        console.log(`• Usuario ${email} creado en Firebase Auth.`);
    }
    await db.collection("usuarios").doc(usuario.uid).set({
        email, name, role: "Administrador", areaId: null, activo: true, createdAt: new Date().toISOString()
    }, { merge: true });
    console.log("• Rol Administrador asignado.");
};

const cargar = async (coleccion, registros, etiqueta) => {
    const existentes = await db.collection(coleccion).limit(1).get();
    if (!existentes.empty) return console.log(`• ${etiqueta}: ya existían; no se modificaron.`);
    const batch = db.batch();
    const fecha = new Date().toISOString();
    registros.forEach((r) => batch.set(db.collection(coleccion).doc(), { ...r, activo: true, fechaRegistro: fecha, fechaActualizacion: fecha }));
    await batch.commit();
    console.log(`• ${registros.length} ${etiqueta.toLowerCase()} cargados.`);
};

try {
    await crearAdmin();
    await cargar("tiposActivo", TIPOS.map(([nombre, vidaUtilAnios]) => ({ nombre, prefijo: prefijoDeNombre(nombre), vidaUtilAnios })), "Tipos de activo");
    await cargar("sucursales", SUCURSALES.map((nombre) => ({ nombre, ciudad: "" })), "Sucursales");
    console.log("\nListo. Inicia sesión y completa Áreas y Asociados en Catálogos; luego registra los activos.");
    process.exit(0);
} catch (error) {
    console.error("Error en el seed:", error.message);
    process.exit(1);
}
