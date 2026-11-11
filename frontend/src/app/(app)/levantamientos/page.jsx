"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FaPlus } from "react-icons/fa";

import EncabezadoPagina from "../../../components/ui/EncabezadoPagina";
import Cargando from "../../../components/ui/Cargando";
import { claseInput } from "../../../components/ui/estilos";
import { tablaCaja, botonCabecera } from "../../../components/ui/tarjeta";
import { alertaError } from "../../../components/ui/alertas";
import EstadoLevantamiento from "../../../components/levantamientos/EstadoLevantamiento";
import { useAuth } from "../../../context/AuthContext";
import { obtenerLevantamientos } from "../../../services/levantamientos.service";
import { ROLES_LEVANTAMIENTO } from "../../../utils/roles";
import { formatoFecha, mensajeError } from "../../../utils/formato";

function Levantamientos() {
    const router = useRouter();
    const sp = useSearchParams();
    const { userRole } = useAuth();
    const [filtros, setFiltros] = useState({ q: "", estado: sp.get("estado") || "" });
    const [lista, setLista] = useState(null);

    useEffect(() => {
        setLista(null);
        const t = setTimeout(() => {
            obtenerLevantamientos(Object.fromEntries(Object.entries(filtros).filter(([, v]) => v)))
                .then(({ data }) => setLista(data.data))
                .catch((e) => {
                    setLista([]);
                    alertaError(mensajeError(e));
                });
        }, filtros.q ? 350 : 0);
        return () => clearTimeout(t);
    }, [filtros]);

    const cambiar = (e) => setFiltros((f) => ({ ...f, [e.target.name]: e.target.value }));

    return (
        <>
            <EncabezadoPagina titulo="Levantamientos" descripcion="Auditorías físicas de activos por sucursal o área, con su acta de validación.">
                {ROLES_LEVANTAMIENTO.includes(userRole) && <Link href="/levantamientos/nuevo" className={botonCabecera}><FaPlus /> Nuevo levantamiento</Link>}
            </EncabezadoPagina>

            <div className={tablaCaja}>
                <div className="grid grid-cols-1 gap-3 border-b p-5 sm:grid-cols-3">
                    <input name="q" value={filtros.q} onChange={cambiar} placeholder="Número, sucursal, área, auditor…" aria-label="Buscar" className={`${claseInput} sm:col-span-2`} />
                    <select name="estado" value={filtros.estado} onChange={cambiar} aria-label="Estado" className={claseInput}>
                        <option value="">Todos</option>
                        <option value="EN_PROCESO">En proceso</option>
                        <option value="CERRADO">Cerrados</option>
                    </select>
                </div>
                {lista === null ? <Cargando /> : lista.length === 0 ? (
                    <p className="p-10 text-center text-stone-300">No hay levantamientos.</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-white/5 text-left text-stone-300">
                                <tr>
                                    <th className="px-5 py-4 font-semibold">Número</th>
                                    <th className="px-5 py-4 font-semibold">Fecha</th>
                                    <th className="px-5 py-4 font-semibold">Sucursal · Área</th>
                                    <th className="px-5 py-4 font-semibold">Líder de área</th>
                                    <th className="px-5 py-4 font-semibold">Auditor</th>
                                    <th className="px-5 py-4 font-semibold text-right">Resultado</th>
                                    <th className="px-5 py-4 font-semibold">Estado</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/10">
                                {lista.map((l) => (
                                    <tr key={l.id} tabIndex={0} onClick={() => router.push(`/levantamientos/${l.id}`)} onKeyDown={(e) => e.key === "Enter" && router.push(`/levantamientos/${l.id}`)} className="cursor-pointer hover:bg-white/5 focus:bg-white/10">
                                        <td className="px-5 py-3 font-semibold text-white whitespace-nowrap">{l.numero}</td>
                                        <td className="px-5 py-3 text-stone-300 whitespace-nowrap">{formatoFecha(l.fecha)}</td>
                                        <td className="px-5 py-3 text-stone-200">{[l.sucursalNombre, l.areaNombre].filter(Boolean).join(" · ")}{l.responsableNombre && <span className="block text-xs text-stone-400">{l.responsableNombre}</span>}</td>
                                        <td className="px-5 py-3 text-stone-300">{l.liderNombre || "—"}</td>
                                        <td className="px-5 py-3 text-stone-300">{l.auditorNombre}</td>
                                        <td className="px-5 py-3 text-right whitespace-nowrap text-stone-200">
                                            {l.resumen?.encontrados ?? 0}/{(l.resumen?.total ?? 0) - (l.resumen?.hallazgos ?? 0)}
                                            {l.resumen?.noEncontrados > 0 && <span className="ml-2 text-red-300">{l.resumen.noEncontrados} faltan</span>}
                                            {l.resumen?.hallazgos > 0 && <span className="ml-2 text-sky-300">+{l.resumen.hallazgos}</span>}
                                        </td>
                                        <td className="px-5 py-3"><EstadoLevantamiento estado={l.estado} /></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </>
    );
}

export default function LevantamientosPage() {
    return (
        <Suspense fallback={<Cargando />}>
            <Levantamientos />
        </Suspense>
    );
}
