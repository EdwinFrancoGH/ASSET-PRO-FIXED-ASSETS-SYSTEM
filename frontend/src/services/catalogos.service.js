import api from "./api";

// catalogo: "tipos-activo" | "sucursales" | "areas" | "asociados"
export const obtenerCatalogo = (catalogo, soloActivos = false) =>
    api.get(`/catalogos/${catalogo}`, { params: soloActivos ? { activos: "true" } : {} });

export const crearEnCatalogo = (catalogo, datos) => api.post(`/catalogos/${catalogo}`, datos);
export const actualizarEnCatalogo = (catalogo, id, datos) => api.put(`/catalogos/${catalogo}/${id}`, datos);
export const eliminarDeCatalogo = (catalogo, id) => api.delete(`/catalogos/${catalogo}/${id}`);

// Auditor / inventario: agregar un asociado desde el levantamiento.
export const registrarAsociado = (datos) => api.post("/catalogos/asociados/registro", datos);

// Los cuatro catálogos de una vez (formularios y filtros).
export const obtenerTodosLosCatalogos = async (soloActivos = true) => {
    const [tipos, sucursales, areas, asociados] = await Promise.all(
        ["tipos-activo", "sucursales", "areas", "asociados"].map((c) => obtenerCatalogo(c, soloActivos))
    );
    return { tipos: tipos.data.data, sucursales: sucursales.data.data, areas: areas.data.data, asociados: asociados.data.data };
};
