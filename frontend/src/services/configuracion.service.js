import api from "./api";

// Permisos configurables por el Administrador (qué catálogos puede modificar el Auditor).
export const obtenerPermisos = () => api.get("/configuracion/permisos");
export const actualizarPermisos = (datos) => api.put("/configuracion/permisos", datos);
