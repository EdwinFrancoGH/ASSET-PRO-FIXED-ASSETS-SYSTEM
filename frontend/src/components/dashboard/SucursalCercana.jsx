"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { FiCrosshair, FiNavigation, FiRefreshCw, FiMapPin } from "react-icons/fi";
import Cargando from "../ui/Cargando";
import { tarjeta } from "../ui/tarjeta";
import { obtenerSucursalesCercanas } from "../../services/programacion.service";
import { obtenerMiUbicacion, urlComoLlegar, urlMapaEmbebido, formatoDuracion } from "../../utils/mapas";
import { mensajeError } from "../../utils/formato";

// Sucursal de Electrolab Médic más cercana a la ubicación actual del usuario.
// La distancia y el tiempo en carro los calcula el backend con la Google Routes API.
export default function SucursalCercana({ sucursalesDeHoy = [], puedeConfigurar = false }) {
    const [estado, setEstado] = useState("inicio"); // inicio | buscando | listo | error
    const [error, setError] = useState("");
    const [origen, setOrigen] = useState(null);
    const [res, setRes] = useState(null);

    const buscar = useCallback(async () => {
        setEstado("buscando");
        setError("");
        try {
            const ubic = await obtenerMiUbicacion();
            setOrigen(ubic);
            const { data } = await obtenerSucursalesCercanas(ubic.lat, ubic.lng, 4);
            setRes(data.data);
            setEstado("listo");
        } catch (e) {
            setError(e.response ? mensajeError(e) : e.message);
            setEstado("error");
        }
    }, []);

    // Si el usuario ya dio permiso de ubicación antes, se busca sola al abrir el panel.
    useEffect(() => {
        navigator.permissions?.query({ name: "geolocation" }).then((p) => p.state === "granted" && buscar()).catch(() => {});
    }, [buscar]);

    const [cercana, ...otras] = res?.sucursales || [];

    return (
        <section className={`${tarjeta} flex flex-col p-5 sm:p-6`}>
            <div className="mb-4 flex items-start justify-between gap-3">
                <div>
                    <h2 className="flex items-center gap-2 text-lg font-semibold text-white"><FiCrosshair className="text-brand-300" /> Sucursal más cercana</h2>
                    <p className="text-sm text-stone-400">Según tu ubicación actual</p>
                </div>
                {estado === "listo" && (
                    <button onClick={buscar} className="flex items-center gap-1 text-sm text-brand-300 hover:underline"><FiRefreshCw /> Actualizar</button>
                )}
            </div>

            {estado === "inicio" && (
                <div className="flex flex-1 flex-col items-center justify-center gap-3 rounded-2xl bg-white/5 p-6 text-center">
                    <FiMapPin className="text-3xl text-stone-500" />
                    <p className="text-stone-300">Comparte tu ubicación para ver qué sucursal te queda más cerca.</p>
                    <button onClick={buscar} className="rounded-xl bg-brand-500/20 px-4 py-2 text-sm font-semibold text-brand-200 ring-1 ring-brand-400/40 hover:bg-brand-500/30">Usar mi ubicación</button>
                </div>
            )}

            {estado === "buscando" && <Cargando texto="Buscando la sucursal más cercana..." />}

            {estado === "error" && (
                <div className="space-y-3 rounded-2xl bg-red-500/10 p-4 text-sm text-red-200 ring-1 ring-red-400/30">
                    <p>{error}</p>
                    <button onClick={buscar} className="font-semibold text-white hover:underline">Intentar de nuevo</button>
                </div>
            )}

            {estado === "listo" && !cercana && (
                <div className="rounded-2xl bg-amber-500/10 p-4 text-sm text-amber-200 ring-1 ring-amber-400/30">
                    Ninguna sucursal tiene ubicación registrada.
                    {puedeConfigurar ? <> Agrégala en <Link href="/catalogos" className="font-semibold underline">Catálogos → Sucursales</Link>.</> : " Pide al responsable de inventario que la registre."}
                </div>
            )}

            {estado === "listo" && cercana && (
                <div className="space-y-3">
                    <div className="rounded-2xl bg-brand-500/10 p-4 ring-1 ring-brand-400/30">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                            <div className="min-w-0">
                                <p className="text-lg font-bold text-white">{cercana.nombre}</p>
                                <p className="text-xs text-stone-400">{[cercana.direccion, cercana.ciudad].filter(Boolean).join(" · ") || "Electrolab Médic"}</p>
                            </div>
                            <div className="text-right">
                                <p className="text-2xl font-bold text-brand-300">{cercana.distanciaKm} km</p>
                                {cercana.duracionMin != null && <p className="text-xs text-stone-300">{formatoDuracion(cercana.duracionMin)} en carro</p>}
                            </div>
                        </div>
                        {sucursalesDeHoy.includes(cercana.id) && <p className="mt-2 text-xs font-semibold text-emerald-300">✓ Está en tu programación de hoy</p>}
                        <a href={urlComoLlegar(cercana)} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex items-center gap-2 rounded-xl bg-white/10 px-4 py-2 text-sm font-semibold text-white ring-1 ring-white/15 hover:bg-white/20">
                            <FiNavigation /> Cómo llegar
                        </a>
                    </div>

                    <iframe title={`Ruta a ${cercana.nombre}`} src={urlMapaEmbebido(cercana, origen)} loading="lazy" referrerPolicy="no-referrer-when-downgrade"
                        className="h-48 w-full rounded-2xl border-0 ring-1 ring-white/10" allowFullScreen />

                    {otras.length > 0 && (
                        <ul className="divide-y divide-white/10 rounded-2xl bg-white/5 text-sm">
                            {otras.map((s) => (
                                <li key={s.id} className="flex items-center justify-between gap-3 px-4 py-2">
                                    <a href={urlComoLlegar(s)} target="_blank" rel="noopener noreferrer" className="truncate text-stone-200 hover:text-white hover:underline">
                                        {s.nombre}{sucursalesDeHoy.includes(s.id) && <span className="ml-2 text-xs text-emerald-300">hoy</span>}
                                    </a>
                                    <span className="flex-none text-stone-400">{s.distanciaKm} km{s.duracionMin != null && ` · ${formatoDuracion(s.duracionMin)}`}</span>
                                </li>
                            ))}
                        </ul>
                    )}
                    <p className="text-[11px] text-stone-500">
                        {res.fuente === "google" ? "Distancia y tiempo por carretera: Google Maps." : "Distancia en línea recta (configura GOOGLE_MAPS_API_KEY para ver ruta y tiempo reales)."}
                        {res.sinUbicacion > 0 && ` ${res.sinUbicacion} sucursal(es) sin ubicación registrada.`}
                    </p>
                </div>
            )}
        </section>
    );
}
