const vacio = (v) => v === undefined || v === null || String(v).trim() === "";

export const validarCatalogo = (catalogo, datos) => {
    if (vacio(datos.nombre) || String(datos.nombre).trim().length < 2) {
        return "El nombre es obligatorio (mínimo 2 caracteres).";
    }
    if (catalogo === "tipos-activo") {
        if (!vacio(datos.prefijo) && !/^[A-Za-z0-9]{2,5}$/.test(String(datos.prefijo).trim())) {
            return "El prefijo debe tener de 2 a 5 letras o números (ej. LAP).";
        }
        if (!vacio(datos.vidaUtilAnios)) {
            const v = Number(datos.vidaUtilAnios);
            if (!Number.isFinite(v) || v <= 0 || v > 100) return "La vida útil debe ser un número de años mayor que 0.";
        }
    }
    if (catalogo === "sucursales") {
        const hayLat = !vacio(datos.lat), hayLng = !vacio(datos.lng);
        if (hayLat !== hayLng) return "Indica latitud y longitud, o deja ambas vacías.";
        if (hayLat && (!Number.isFinite(Number(datos.lat)) || Math.abs(Number(datos.lat)) > 90)) return "La latitud no es válida (ej. 13.6929).";
        if (hayLng && (!Number.isFinite(Number(datos.lng)) || Math.abs(Number(datos.lng)) > 180)) return "La longitud no es válida (ej. -89.2182).";
    }
    if (catalogo === "asociados" && !vacio(datos.correo) && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(datos.correo).trim())) {
        return "El correo del asociado no es válido.";
    }
    return null;
};
