// Copia de backend/src/config/roles.js
export const ROLES = {
    ADMIN: "Administrador",
    INVENTARIO: "Responsable inventario",
    AUDITOR: "Auditor",
    CONSULTA: "Consulta"
};

export const LISTA_ROLES = [ROLES.INVENTARIO, ROLES.AUDITOR, ROLES.CONSULTA, ROLES.ADMIN];
export const ROLES_GESTION = [ROLES.ADMIN, ROLES.INVENTARIO];
export const ROLES_LEVANTAMIENTO = [ROLES.ADMIN, ROLES.INVENTARIO, ROLES.AUDITOR];
// Ven Catálogos con opción de editar (el Auditor, solo lo que el Administrador le habilite).
export const ROLES_CATALOGOS = [ROLES.ADMIN, ROLES.INVENTARIO, ROLES.AUDITOR];

// Acciones sobre activos que el Administrador puede habilitar al Auditor.
export const ACCIONES_ACTIVOS_CONFIGURABLES = [
    ["editar", "Editar activos", "Botón “Editar” en la ficha del activo (datos, compra, condición y foto)"],
    ["movimientos", "Registrar movimientos", "Asignación, reasignación, traslado, préstamo, devolución, mantenimiento y baja"]
];

// Catálogos cuyo permiso de edición del Auditor configura el Administrador.
export const CATALOGOS_CONFIGURABLES = [
    ["tipos-activo", "Tipos de activo"],
    ["sucursales", "Sucursales"],
    ["areas", "Áreas"],
    ["asociados", "Asociados"]
];

export const DESCRIPCION_ROLES = {
    "Responsable inventario": "Registra activos, movimientos y catálogos; hace levantamientos y exporta a Excel.",
    Auditor: "Hace los levantamientos físicos y genera el acta; administra los catálogos que el Administrador le habilite. No gestiona usuarios.",
    Consulta: "Solo lectura: consulta activos, movimientos y levantamientos.",
    Administrador: "Todo lo anterior y además gestiona usuarios."
};

export const BIENVENIDA_ROLES = {
    "Responsable inventario": "Mantén al día el inventario: altas, asignaciones, traslados y bajas.",
    Auditor: "Revisa tu programación, levanta los activos en sitio y mantén los catálogos al día.",
    Consulta: "Consulta el consolidado de activos fijos y su historial.",
    Administrador: "Administra usuarios, catálogos y el inventario completo de activos fijos."
};
