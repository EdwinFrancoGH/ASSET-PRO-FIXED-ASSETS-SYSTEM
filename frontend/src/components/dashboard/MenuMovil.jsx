"use client";

import Link from "next/link";
import { FiChevronRight, FiBarChart2, FiMapPin } from "react-icons/fi";
import { tarjeta } from "../ui/tarjeta";
import { menuParaRol } from "../layout/menu";

// Inicio en pantallas pequeñas: las opciones del menú como botones grandes
// (mismo estilo que las tarjetas del panel). En md+ no se muestra.
export default function MenuMovil({ nombre, rol, hoy, onVerPanel }) {
    const opciones = menuParaRol(rol).filter((o) => !o.soloSidebar);
    const visita = (hoy?.visitas || []).find((v) => v.estado === "PENDIENTE");

    return (
        <div className="md:hidden">
            <div className="mb-5 px-1">
                <h1 className="text-2xl font-bold text-white">Hola, {nombre}</h1>
                <p className="text-stone-300">¿Qué quieres hacer hoy?</p>
            </div>

            {visita && (
                <Link href="/programacion" className={`${tarjeta} mb-4 flex items-center gap-4 p-4 ring-1 ring-brand-400/40`}>
                    <span className="flex h-12 w-12 flex-none items-center justify-center rounded-2xl bg-brand-500/20 text-2xl text-brand-300"><FiMapPin /></span>
                    <div className="min-w-0 flex-1">
                        <p className="text-xs uppercase tracking-wide text-brand-300">Hoy te toca levantar</p>
                        <p className="truncate text-lg font-bold text-white">{visita.sucursalNombre || visita.areaNombre}</p>
                    </div>
                    <FiChevronRight className="flex-none text-stone-400" />
                </Link>
            )}

            <div className="grid grid-cols-2 gap-4">
                {opciones.map((o) => (
                    <Link key={o.href} href={o.href}
                        className={`${tarjeta} flex min-h-32 flex-col justify-between gap-3 p-4 transition active:scale-[0.98] hover:border-brand-400/60 hover:bg-stone-800/50`}>
                        <span className={`flex h-12 w-12 items-center justify-center rounded-2xl text-2xl ${o.fondo}`}>{o.icon}</span>
                        <span>
                            <span className="block font-semibold leading-tight text-white">{o.name}</span>
                            {o.descripcion && <span className="block text-xs text-stone-400">{o.descripcion}</span>}
                        </span>
                    </Link>
                ))}
                <button onClick={onVerPanel}
                    className={`${tarjeta} col-span-2 flex items-center gap-4 p-4 text-left transition active:scale-[0.98] hover:border-brand-400/60`}>
                    <span className="flex h-12 w-12 flex-none items-center justify-center rounded-2xl bg-white/10 text-2xl text-stone-200"><FiBarChart2 /></span>
                    <span className="flex-1">
                        <span className="block font-semibold text-white">Ver resumen del panel</span>
                        <span className="block text-xs text-stone-400">Valores, estados, sucursal más cercana y movimientos</span>
                    </span>
                    <FiChevronRight className="text-stone-400" />
                </button>
            </div>
        </div>
    );
}
