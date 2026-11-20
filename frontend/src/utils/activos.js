// Copia de backend/src/config/activos.js (etiquetas y colores para la UI).
export const INFO_ESTADO = {
    DISPONIBLE: { etiqueta: "Disponible", clase: "bg-sky-500/15 text-sky-200 ring-sky-400/30" },
    ASIGNADO: { etiqueta: "Asignado", clase: "bg-emerald-500/15 text-emerald-200 ring-emerald-400/30" },
    PRESTADO: { etiqueta: "Prestado", clase: "bg-violet-500/15 text-violet-200 ring-violet-400/30" },
    EN_REPARACION: { etiqueta: "En reparación", clase: "bg-amber-500/15 text-amber-200 ring-amber-400/30" },
    BAJA: { etiqueta: "Baja", clase: "bg-white/10 text-stone-300 ring-white/20" }
};
export const LISTA_ESTADOS = Object.keys(INFO_ESTADO);

export const INFO_CONDICION = {
    BUENO: { etiqueta: "Bueno", clase: "text-emerald-300" },
    REGULAR: { etiqueta: "Regular", clase: "text-amber-300" },
    MALO: { etiqueta: "Malo", clase: "text-red-300" }
};
export const LISTA_CONDICIONES = Object.keys(INFO_CONDICION);

// Tipos de movimiento. "desde": estados en los que se permite (igual que el backend).
export const TIPOS_MOVIMIENTO = {
    ASIGNACION: { etiqueta: "Asignación", ayuda: "Entrega el activo a un asociado (puede cambiar su ubicación).", desde: ["DISPONIBLE", "ASIGNADO"], responsable: true, ubicacion: true },
    REASIGNACION: { etiqueta: "Reasignación", ayuda: "El colaborador deja el puesto: el activo pasa a quien lo reemplaza, en la misma sucursal, área y ubicación.", desde: ["ASIGNADO"], responsable: true, etiquetaResponsable: "Nuevo colaborador en el puesto", mismaUbicacion: true },
    TRASLADO: { etiqueta: "Traslado", ayuda: "Cambia sucursal, área o ubicación (y opcionalmente el responsable).", desde: ["DISPONIBLE", "ASIGNADO", "PRESTADO"], responsable: "opcional", ubicacion: true },
    PRESTAMO: { etiqueta: "Préstamo", ayuda: "Préstamo temporal a un asociado; el activo queda Prestado.", desde: ["DISPONIBLE", "ASIGNADO"], responsable: true, ubicacion: true, devolucion: true },
    DEVOLUCION: { etiqueta: "Devolución", ayuda: "El activo regresa a inventario y queda Disponible, sin responsable.", desde: ["ASIGNADO", "PRESTADO"] },
    MANTENIMIENTO: { etiqueta: "Envío a mantenimiento", ayuda: "El activo queda En reparación. Indica el taller o el problema.", desde: ["DISPONIBLE", "ASIGNADO", "PRESTADO"] },
    RETORNO_MANTENIMIENTO: { etiqueta: "Retorno de mantenimiento", ayuda: "Vuelve al estado que tenía antes de la reparación.", desde: ["EN_REPARACION"], condicion: true },
    BAJA: { etiqueta: "Baja", ayuda: "Retiro definitivo del inventario. El motivo es obligatorio.", desde: ["DISPONIBLE", "ASIGNADO", "PRESTADO", "EN_REPARACION"], peligro: true }
};

export const ETIQUETAS_MOVIMIENTO = {
    ALTA: "Alta (registro)",
    ...Object.fromEntries(Object.entries(TIPOS_MOVIMIENTO).map(([k, v]) => [k, v.etiqueta]))
};

export const COLOR_MOVIMIENTO = {
    ALTA: "bg-sky-500",
    ASIGNACION: "bg-emerald-500",
    REASIGNACION: "bg-teal-500",
    TRASLADO: "bg-brand-500",
    PRESTAMO: "bg-violet-500",
    DEVOLUCION: "bg-sky-500",
    MANTENIMIENTO: "bg-amber-500",
    RETORNO_MANTENIMIENTO: "bg-emerald-500",
    BAJA: "bg-stone-500"
};

export const textoUbicacion = (u) => [u?.sucursalNombre, u?.areaNombre, u?.ubicacion].filter(Boolean).join(" · ") || "—";
