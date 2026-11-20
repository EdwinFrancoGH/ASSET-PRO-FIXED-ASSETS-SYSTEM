// Única fuente de verdad de los roles. El frontend tiene una copia
// equivalente en src/utils/roles.js.
export const ROLES = {
    ADMIN: "Administrador",
    // Control de activos fijos: registra activos, movimientos, catálogos,
    // levantamientos y exporta a Excel. Firma el acta como "Responsable Inventario".
    INVENTARIO: "Responsable inventario",
    // Hace levantamientos físicos (auditorías), genera el acta y administra los
    // catálogos que el Administrador le habilite (configuracion/permisos).
    AUDITOR: "Auditor",
    // Solo lectura (gerencia, contabilidad).
    CONSULTA: "Consulta"
};

export const LISTA_ROLES = Object.values(ROLES);

// Quiénes pueden registrar y modificar activos y movimientos (y siempre los catálogos).
export const ROLES_GESTION = [ROLES.ADMIN, ROLES.INVENTARIO];

// Quiénes pueden hacer levantamientos.
export const ROLES_LEVANTAMIENTO = [ROLES.ADMIN, ROLES.INVENTARIO, ROLES.AUDITOR];

// Quiénes ven la pantalla de Catálogos con opción de editar (el Auditor, según permisos).
export const ROLES_CATALOGOS = [ROLES.ADMIN, ROLES.INVENTARIO, ROLES.AUDITOR];
