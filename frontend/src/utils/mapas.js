// Enlaces y mapas de Google Maps.
// NEXT_PUBLIC_GOOGLE_MAPS_API_KEY (opcional) habilita la Maps Embed API (ruta
// dibujada en el mapa). Sin clave se usa el mapa embebido sencillo con un marcador.
const CLAVE = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "";

const destinoDe = (s) => (s?.lat != null && s?.lng != null ? `${s.lat},${s.lng}` : [s?.direccion, s?.ciudad, "El Salvador"].filter(Boolean).join(", "));

// Abre Google Maps (app o web) con la ruta desde la ubicación actual.
export const urlComoLlegar = (sucursal) =>
    `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destinoDe(sucursal))}&travelmode=driving`;

// URL para <iframe>. Con origen y clave muestra la ruta; si no, el punto.
export const urlMapaEmbebido = (sucursal, origen) => {
    const destino = destinoDe(sucursal);
    if (CLAVE && origen) {
        return `https://www.google.com/maps/embed/v1/directions?key=${CLAVE}&origin=${origen.lat},${origen.lng}&destination=${encodeURIComponent(destino)}&mode=driving&language=es`;
    }
    if (CLAVE) return `https://www.google.com/maps/embed/v1/place?key=${CLAVE}&q=${encodeURIComponent(destino)}&zoom=15&language=es`;
    return `https://maps.google.com/maps?q=${encodeURIComponent(destino)}&z=15&hl=es&output=embed`;
};

export const tieneUbicacion = (s) => s?.lat != null && s?.lng != null;

// Ubicación del navegador como promesa.
export const obtenerMiUbicacion = () =>
    new Promise((resolve, reject) => {
        if (typeof navigator === "undefined" || !navigator.geolocation) return reject(new Error("Tu navegador no permite obtener la ubicación."));
        navigator.geolocation.getCurrentPosition(
            (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude, precision: p.coords.accuracy }),
            (e) => reject(new Error(e.code === 1 ? "Permiso de ubicación denegado. Actívalo en el candado de la barra de direcciones." : "No se pudo obtener tu ubicación.")),
            { enableHighAccuracy: true, timeout: 15000, maximumAge: 5 * 60 * 1000 }
        );
    });

export const formatoDuracion = (min) => {
    if (min == null) return null;
    if (min < 60) return `${min} min`;
    return `${Math.floor(min / 60)} h ${String(min % 60).padStart(2, "0")} min`;
};
