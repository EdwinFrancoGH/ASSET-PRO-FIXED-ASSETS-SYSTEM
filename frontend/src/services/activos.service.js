import api from "./api";

const limpiar = (p = {}) => Object.fromEntries(Object.entries(p).filter(([, v]) => v !== "" && v !== null && v !== undefined));

export const obtenerActivos = (filtros) => api.get("/activos", { params: limpiar(filtros) });
export const obtenerResumen = () => api.get("/activos/resumen");
export const exportarActivos = (filtros) => api.get("/activos/exportar", { params: limpiar(filtros), responseType: "blob" });
export const obtenerActivo = (id) => api.get(`/activos/${id}`);
export const crearActivo = (datos) => api.post("/activos", datos);
export const actualizarActivo = (id, datos) => api.put(`/activos/${id}`, datos);
export const eliminarActivo = (id) => api.delete(`/activos/${id}`);
export const registrarMovimiento = (id, datos) => api.post(`/activos/${id}/movimientos`, datos);

export const obtenerMovimientos = (filtros) => api.get("/movimientos", { params: limpiar(filtros) });
export const exportarMovimientos = (filtros) => api.get("/movimientos/exportar", { params: limpiar(filtros), responseType: "blob" });
