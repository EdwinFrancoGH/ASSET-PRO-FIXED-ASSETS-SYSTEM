import api from "./api";

export const obtenerLevantamientos = (filtros = {}) => api.get("/levantamientos", { params: filtros });
export const obtenerLevantamiento = (id) => api.get(`/levantamientos/${id}`);
export const crearLevantamiento = (datos) => api.post("/levantamientos", datos);
export const guardarLevantamiento = (id, datos) => api.put(`/levantamientos/${id}`, datos);
export const cerrarLevantamiento = (id, datos) => api.post(`/levantamientos/${id}/cerrar`, datos);
export const eliminarLevantamiento = (id) => api.delete(`/levantamientos/${id}`);
export const descargarActa = (id, responsable) => api.get(`/levantamientos/${id}/acta`, { params: responsable ? { responsable } : {}, responseType: "blob" });
