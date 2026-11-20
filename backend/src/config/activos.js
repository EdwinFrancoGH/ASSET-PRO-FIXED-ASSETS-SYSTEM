// Reglas del inventario de activos fijos (basadas en FIXED ASSET KERNEL V1.2).

// Estado de uso del activo (hoja BD → N_ESTADO).
export const ESTADOS = {
    DISPONIBLE: "DISPONIBLE",
    ASIGNADO: "ASIGNADO",
    PRESTADO: "PRESTADO",
    EN_REPARACION: "EN_REPARACION",
    BAJA: "BAJA"
};
export const LISTA_ESTADOS = Object.values(ESTADOS);
export const ETIQUETAS_ESTADO = {
    DISPONIBLE: "Disponible",
    ASIGNADO: "Asignado",
    PRESTADO: "Prestado",
    EN_REPARACION: "En reparación",
    BAJA: "Baja"
};

// Condición física observada (columna "Estado" del levantamiento).
export const CONDICIONES = { BUENO: "BUENO", REGULAR: "REGULAR", MALO: "MALO" };
export const LISTA_CONDICIONES = Object.values(CONDICIONES);
export const ETIQUETAS_CONDICION = { BUENO: "Bueno", REGULAR: "Regular", MALO: "Malo" };

// Hoja MOVIMIENTOS → TipoMovimiento (Asignación, Traslado, Mantenimiento,
// Baja) + préstamo/devolución, que cubren los estados "Prestado" y "Disponible".
export const TIPOS_MOVIMIENTO = {
    ASIGNACION: "ASIGNACION",
    // El colaborador deja el puesto: el activo pasa a quien lo reemplaza, en la misma ubicación.
    REASIGNACION: "REASIGNACION",
    TRASLADO: "TRASLADO",
    PRESTAMO: "PRESTAMO",
    DEVOLUCION: "DEVOLUCION",
    MANTENIMIENTO: "MANTENIMIENTO",
    RETORNO_MANTENIMIENTO: "RETORNO_MANTENIMIENTO",
    BAJA: "BAJA"
};
export const LISTA_TIPOS_MOVIMIENTO = Object.values(TIPOS_MOVIMIENTO);
export const ETIQUETAS_MOVIMIENTO = {
    ALTA: "Alta (registro)",
    ASIGNACION: "Asignación",
    REASIGNACION: "Reasignación",
    TRASLADO: "Traslado",
    PRESTAMO: "Préstamo",
    DEVOLUCION: "Devolución",
    MANTENIMIENTO: "Envío a mantenimiento",
    RETORNO_MANTENIMIENTO: "Retorno de mantenimiento",
    BAJA: "Baja"
};

export const ESTADOS_LEVANTAMIENTO = { EN_PROCESO: "EN_PROCESO", CERRADO: "CERRADO" };

// Días sin levantamiento a partir de los cuales un activo cuenta como
// "sin auditar" en el panel principal.
export const DIAS_SIN_AUDITAR = 180;

// Depreciación en línea recta, igual que la columna DepreciacionMensual
// del Excel: ValorCompra ÷ (VidaUtilAnios × 12).
const r2 = (n) => Math.round(n * 100) / 100;

export const calcularDepreciacion = (activo, hoy = new Date()) => {
    const valor = Number(activo.valorCompra) || 0;
    const vida = Number(activo.vidaUtilAnios) || 0;
    if (!valor || !vida) {
        return { depreciacionMensual: null, mesesUso: null, depreciacionAcumulada: null, valorLibros: valor || null, porcentajeDepreciado: null };
    }
    const mensual = valor / (vida * 12);
    let meses = 0;
    if (activo.fechaCompra) {
        const [a, m, d] = String(activo.fechaCompra).slice(0, 10).split("-").map(Number);
        meses = (hoy.getFullYear() - a) * 12 + (hoy.getMonth() + 1 - m) - (hoy.getDate() < d ? 1 : 0);
        meses = Math.max(0, Math.min(meses, vida * 12));
    }
    const acumulada = Math.min(valor, mensual * meses);
    return {
        depreciacionMensual: r2(mensual),
        mesesUso: meses,
        depreciacionAcumulada: r2(acumulada),
        valorLibros: r2(valor - acumulada),
        porcentajeDepreciado: r2((acumulada / valor) * 100)
    };
};

// Prefijo del código de activo: igual que =LEFT(EQUIPO,3) del Excel, sin tildes.
export const prefijoDeNombre = (nombre = "") =>
    String(nombre).normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^A-Za-z0-9]/g, "").slice(0, 3).toUpperCase() || "ACT";
