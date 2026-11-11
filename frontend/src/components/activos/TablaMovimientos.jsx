"use client";

import Link from "next/link";
import { ETIQUETAS_MOVIMIENTO, COLOR_MOVIMIENTO, textoUbicacion } from "../../utils/activos";
import { formatoFecha, formatoFechaHora } from "../../utils/formato";

// Hoja MOVIMIENTOS. mostrarActivo=false en la ficha del activo.
export default function TablaMovimientos({ movimientos, mostrarActivo = true, vacio = "No hay movimientos." }) {
    if (!movimientos.length) return <div className="p-10 text-center text-stone-300">{vacio}</div>;
    return (
        <div className="overflow-x-auto">
            <table className="w-full text-sm">
                <thead className="bg-white/5 text-left text-stone-300">
                    <tr>
                        <th className="px-5 py-4 font-semibold">Movimiento</th>
                        {mostrarActivo && <th className="px-5 py-4 font-semibold">Activo</th>}
                        <th className="px-5 py-4 font-semibold">Origen → Destino</th>
                        <th className="px-5 py-4 font-semibold">Responsable</th>
                        <th className="px-5 py-4 font-semibold">Comentario</th>
                        <th className="px-5 py-4 font-semibold">Registró</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                    {movimientos.map((m) => (
                        <tr key={m.id} className="align-top hover:bg-white/5">
                            <td className="px-5 py-3 whitespace-nowrap">
                                <span className="flex items-center gap-2 font-semibold text-white">
                                    <span className={`h-2.5 w-2.5 rounded-full ${COLOR_MOVIMIENTO[m.tipo] || "bg-stone-400"}`} />
                                    {ETIQUETAS_MOVIMIENTO[m.tipo] || m.tipo}
                                </span>
                                <span className="block text-xs text-stone-400">{m.numero} · {formatoFecha(m.fecha)}</span>
                            </td>
                            {mostrarActivo && (
                                <td className="px-5 py-3">
                                    <Link href={`/activos/${m.activoId}`} className="font-semibold text-brand-300 hover:underline">{m.codigo}</Link>
                                    <span className="block text-stone-300">{m.activoDescripcion}</span>
                                </td>
                            )}
                            <td className="px-5 py-3 text-stone-300">
                                {m.tipo === "ALTA" ? textoUbicacion(m.destino) : (
                                    <>
                                        <span className="block">{textoUbicacion(m.origen)}</span>
                                        {textoUbicacion(m.origen) !== textoUbicacion(m.destino) && <span className="block text-white">→ {textoUbicacion(m.destino)}</span>}
                                    </>
                                )}
                            </td>
                            <td className="px-5 py-3 text-stone-300">
                                {m.responsableAnteriorNombre !== m.responsableNuevoNombre ? (
                                    <>
                                        <span className="block">{m.responsableAnteriorNombre || "—"}</span>
                                        <span className="block text-white">→ {m.responsableNuevoNombre || "Sin responsable"}</span>
                                    </>
                                ) : m.responsableNuevoNombre || "—"}
                            </td>
                            <td className="px-5 py-3 max-w-xs text-stone-300">{m.comentario || "—"}{m.fechaDevolucion && <span className="block text-xs text-violet-300">Devolver: {formatoFecha(m.fechaDevolucion)}</span>}</td>
                            <td className="px-5 py-3 whitespace-nowrap text-stone-400">{m.usuarioNombre}<span className="block text-xs">{formatoFechaHora(m.fechaRegistro)}</span></td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
