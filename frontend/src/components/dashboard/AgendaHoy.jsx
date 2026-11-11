"use client";

import Link from "next/link";
import { FiCalendar, FiMapPin, FiNavigation, FiPlay, FiCheckCircle, FiClock } from "react-icons/fi";
import Cargando from "../ui/Cargando";
import { tarjeta } from "../ui/tarjeta";
import { urlComoLlegar, urlMapaEmbebido, tieneUbicacion } from "../../utils/mapas";
import { horario, nombreDia, diaMes } from "../../utils/semana";

// "¿Qué levanto hoy?": visitas programadas del usuario para hoy (módulo Programación).
export default function AgendaHoy({ hoy }) {
    const visitas = hoy?.visitas || [];
    const conMapa = visitas.find((v) => v.estado === "PENDIENTE" && tieneUbicacion(v.sucursal)) || visitas.find((v) => tieneUbicacion(v.sucursal));

    return (
        <section className={`${tarjeta} flex flex-col p-5 sm:p-6`}>
            <div className="mb-4 flex items-start justify-between gap-3">
                <div>
                    <h2 className="flex items-center gap-2 text-lg font-semibold text-white"><FiCalendar className="text-brand-300" /> Hoy te toca levantar</h2>
                    {hoy && <p className="text-sm capitalize text-stone-400">{nombreDia(hoy.fecha)} {diaMes(hoy.fecha)}</p>}
                </div>
                <Link href="/programacion" className="text-sm text-brand-300 hover:underline">Mi programación</Link>
            </div>

            {hoy === null ? <Cargando texto="Cargando tu agenda..." /> : hoy === false ? (
                <p className="text-sm text-stone-400">No se pudo cargar la programación.</p>
            ) : visitas.length === 0 ? (
                <div className="flex flex-1 flex-col items-center justify-center gap-3 rounded-2xl bg-white/5 p-6 text-center">
                    <FiCalendar className="text-3xl text-stone-500" />
                    <p className="text-stone-300">No tienes visitas programadas para hoy.</p>
                    <Link href="/programacion" className="rounded-xl bg-brand-500/20 px-4 py-2 text-sm font-semibold text-brand-200 ring-1 ring-brand-400/40 hover:bg-brand-500/30">Programar mi semana</Link>
                </div>
            ) : (
                <div className="space-y-3">
                    {visitas.map((v) => {
                        const realizada = v.estado === "REALIZADA";
                        const params = new URLSearchParams({ programacionId: v.id, ...(v.sucursalId && { sucursalId: v.sucursalId }), ...(v.areaId && { areaId: v.areaId }) });
                        return (
                            <div key={v.id} className={`rounded-2xl p-4 ring-1 ${realizada ? "bg-emerald-500/10 ring-emerald-400/30" : "bg-white/5 ring-white/10"}`}>
                                <div className="flex flex-wrap items-start justify-between gap-2">
                                    <div className="min-w-0">
                                        <p className="flex items-center gap-2 text-lg font-bold text-white">
                                            <FiMapPin className="flex-none text-brand-300" />
                                            <span className="truncate">{v.sucursalNombre || v.areaNombre}</span>
                                        </p>
                                        {v.sucursalNombre && v.areaNombre && <p className="text-sm text-stone-300">Área: {v.areaNombre}</p>}
                                        {v.sucursal?.direccion && <p className="text-xs text-stone-400">{v.sucursal.direccion}</p>}
                                    </div>
                                    <span className="flex items-center gap-1 rounded-full bg-white/10 px-3 py-1 text-xs text-stone-200"><FiClock /> {horario(v)}</span>
                                </div>
                                {v.nota && <p className="mt-2 text-sm italic text-stone-300">“{v.nota}”</p>}
                                <div className="mt-3 flex flex-wrap gap-2">
                                    {realizada ? (
                                        <>
                                            <span className="flex items-center gap-1 text-sm font-semibold text-emerald-300"><FiCheckCircle /> Realizada</span>
                                            {v.levantamientoId && <Link href={`/levantamientos/${v.levantamientoId}`} className="text-sm text-brand-300 hover:underline">Ver levantamiento</Link>}
                                        </>
                                    ) : (
                                        <Link href={`/levantamientos/nuevo?${params}`} className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-brand-500 to-brand-700 px-4 py-2 text-sm font-semibold text-white hover:from-brand-400 hover:to-brand-600">
                                            <FiPlay /> Iniciar levantamiento
                                        </Link>
                                    )}
                                    {v.sucursal && (
                                        <a href={urlComoLlegar({ ...v.sucursal, direccion: v.sucursal.direccion || `Electrolab Médic ${v.sucursalNombre}` })} target="_blank" rel="noopener noreferrer"
                                            className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-4 py-2 text-sm font-semibold text-white ring-1 ring-white/15 hover:bg-white/20">
                                            <FiNavigation /> Cómo llegar
                                        </a>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                    {conMapa && (
                        <iframe title={`Mapa de ${conMapa.sucursalNombre}`} src={urlMapaEmbebido(conMapa.sucursal)} loading="lazy" referrerPolicy="no-referrer-when-downgrade"
                            className="h-48 w-full rounded-2xl border-0 ring-1 ring-white/10" allowFullScreen />
                    )}
                </div>
            )}
        </section>
    );
}
