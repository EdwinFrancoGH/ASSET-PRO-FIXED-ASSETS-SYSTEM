// Ubicación de sucursales con Google Maps Platform (desde el backend, así la
// clave del servidor no viaja al navegador).
//   • Geocoding API → convierte la dirección de una sucursal en lat/lng.
//   • Routes API (computeRouteMatrix) → distancia y tiempo en carro reales.
// Sin GOOGLE_MAPS_API_KEY en .env (o si Google falla) se usa la distancia en
// línea recta (Haversine), así el panel siempre muestra la más cercana.
import { obtenerTodos } from "./catalogos.service.js";
import { ErrorHttp } from "../utils/errores.js";

const CLAVE = () => process.env.GOOGLE_MAPS_API_KEY || "";

const r1 = (n) => Math.round(n * 10) / 10;

export const coordenadaValida = (lat, lng) =>
    Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180 && !(lat === 0 && lng === 0);

// Distancia en línea recta en km.
export const haversineKm = (a, b) => {
    const rad = (g) => (g * Math.PI) / 180;
    const dLat = rad(b.lat - a.lat);
    const dLng = rad(b.lng - a.lng);
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
    return 6371 * 2 * Math.asin(Math.sqrt(h));
};

// Dirección → { lat, lng, direccionGoogle } o null.
export const geocodificar = async (direccion) => {
    if (!CLAVE() || !direccion) return null;
    try {
        const url = new URL("https://maps.googleapis.com/maps/api/geocode/json");
        url.searchParams.set("address", direccion);
        url.searchParams.set("region", "sv");
        url.searchParams.set("language", "es");
        url.searchParams.set("key", CLAVE());
        const r = await fetch(url);
        const json = await r.json();
        const p = json.results?.[0];
        if (json.status !== "OK" || !p) {
            console.warn("Geocoding sin resultado:", json.status, json.error_message || "");
            return null;
        }
        return { lat: p.geometry.location.lat, lng: p.geometry.location.lng, direccionGoogle: p.formatted_address };
    } catch (e) {
        console.warn("Geocoding falló:", e.message);
        return null;
    }
};

// Routes API: una fila origen → N destinos. Devuelve [{ indice, metros, segundos }].
const matrizRutas = async (origen, destinos) => {
    const punto = ({ lat, lng }) => ({ waypoint: { location: { latLng: { latitude: lat, longitude: lng } } } });
    const r = await fetch("https://routes.googleapis.com/distanceMatrix/v2:computeRouteMatrix", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "X-Goog-Api-Key": CLAVE(),
            "X-Goog-FieldMask": "originIndex,destinationIndex,distanceMeters,duration,condition"
        },
        body: JSON.stringify({
            origins: [punto(origen)],
            destinations: destinos.map(punto),
            travelMode: "DRIVE",
            routingPreference: "TRAFFIC_AWARE",
            languageCode: "es"
        })
    });
    if (!r.ok) throw new Error(`Routes API ${r.status}: ${(await r.text()).slice(0, 200)}`);
    const filas = await r.json();
    return filas
        .filter((f) => f.condition === "ROUTE_EXISTS")
        .map((f) => ({ indice: f.destinationIndex, metros: f.distanceMeters, segundos: parseInt(String(f.duration || "0"), 10) }));
};

// Sucursales activas con coordenadas, ordenadas de la más cercana a la más lejana.
export const sucursalesCercanas = async ({ lat, lng, limite = 5 }) => {
    const origen = { lat: Number(lat), lng: Number(lng) };
    if (!coordenadaValida(origen.lat, origen.lng)) throw new ErrorHttp(400, "Ubicación no válida.");

    const todas = await obtenerTodos("sucursales", { soloActivos: true });
    const sucursales = todas.filter((s) => coordenadaValida(Number(s.lat), Number(s.lng)));
    const sinUbicacion = todas.length - sucursales.length;

    if (!sucursales.length) return { fuente: null, sucursales: [], sinUbicacion };

    // 1) Pre-orden en línea recta y se toman las 10 más próximas (la Routes API
    //    cobra por elemento; con 10 alcanza para decidir la más cercana en carretera).
    let lista = sucursales
        .map((s) => ({ ...s, lat: Number(s.lat), lng: Number(s.lng), lineaRectaKm: r1(haversineKm(origen, { lat: Number(s.lat), lng: Number(s.lng) })) }))
        .sort((a, b) => a.lineaRectaKm - b.lineaRectaKm)
        .slice(0, 10);

    let fuente = "linea-recta";
    if (CLAVE()) {
        try {
            const rutas = await matrizRutas(origen, lista);
            const porIndice = new Map(rutas.map((x) => [x.indice, x]));
            lista = lista.map((s, i) => {
                const ruta = porIndice.get(i);
                return ruta ? { ...s, distanciaKm: r1(ruta.metros / 1000), duracionMin: Math.max(1, Math.round(ruta.segundos / 60)) } : s;
            });
            if (rutas.length) fuente = "google";
        } catch (e) {
            console.warn("Routes API falló, se usa línea recta:", e.message);
        }
    }

    lista.sort((a, b) => (a.duracionMin ?? Infinity) - (b.duracionMin ?? Infinity) || a.lineaRectaKm - b.lineaRectaKm);

    return {
        fuente,
        sinUbicacion,
        sucursales: lista.slice(0, Math.min(Number(limite) || 5, 10)).map((s) => ({
            id: s.id,
            nombre: s.nombre,
            ciudad: s.ciudad || "",
            direccion: s.direccion || "",
            lat: s.lat,
            lng: s.lng,
            lineaRectaKm: s.lineaRectaKm,
            distanciaKm: s.distanciaKm ?? s.lineaRectaKm,
            duracionMin: s.duracionMin ?? null
        }))
    };
};
