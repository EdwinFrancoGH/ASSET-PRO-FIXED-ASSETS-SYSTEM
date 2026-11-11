import api from "./api";

// Programación semanal de levantamientos.
export const obtenerProgramacion = (filtros = {}) => api.get("/programacion", { params: filtros });
export const obtenerProgramacionHoy = () => api.get("/programacion/hoy");
export const crearVisita = (datos) => api.post("/programacion", datos);
export const actualizarVisita = (id, datos) => api.put(`/programacion/${id}`, datos);
export const marcarVisitaRealizada = (id, levantamientoId) => api.patch(`/programacion/${id}/realizada`, { levantamientoId });
export const eliminarVisita = (id) => api.delete(`/programacion/${id}`);
export const copiarSemana = (datos) => api.post("/programacion/copiar-semana", datos);

// Sucursales ordenadas por cercanía a { lat, lng } (Google Routes API en el backend).
export const obtenerSucursalesCercanas = (lat, lng, limite = 5) => api.get("/ubicacion/cercanas", { params: { lat, lng, limite } });
