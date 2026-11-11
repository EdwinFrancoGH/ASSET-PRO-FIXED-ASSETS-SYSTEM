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

export const DESCRIPCION_ROLES = {
    "Responsable inventario": "Registra activos, movimientos y catálogos; hace levantamientos y exporta a Excel.",
    Auditor: "Hace los levantamientos físicos que se le asignan y genera el acta.",
    Consulta: "Solo lectura: consulta activos, movimientos y levantamientos.",
    Administrador: "Todo lo anterior y además gestiona usuarios."
};

export const BIENVENIDA_ROLES = {
    "Responsable inventario": "Mantén al día el inventario: altas, asignaciones, traslados y bajas.",
    Auditor: "Revisa tus levantamientos pendientes y valida los activos en sitio.",
    Consulta: "Consulta el consolidado de activos fijos y su historial.",
    Administrador: "Administra usuarios, catálogos y el inventario completo de activos fijos."
};
