"use client";

import { useRouter } from "next/navigation";
import { FaExclamationTriangle } from "react-icons/fa";
import EstadoBadge from "./EstadoBadge";
import { formatoMonto, formatoFecha } from "../../utils/formato";

// Columnas equivalentes a la hoja MAIN (CONSOLIDADO DE ACTIVOS).
export default function TablaActivos({ activos, vacio = "No hay activos." }) {
    const router = useRouter();
    if (!activos.length) return <div className="p-10 text-center text-stone-300">{vacio}</div>;

    const abrir = (a) => router.push(`/activos/${a.id}`);

    return (
        <div className="overflow-x-auto">
            <table className="w-full text-sm">
                <thead className="bg-white/5 text-left text-stone-300">
                    <tr>
                        <th className="px-5 py-4 font-semibold">Código</th>
                        <th className="px-5 py-4 font-semibold">Equipo / descripción</th>
                        <th className="px-5 py-4 font-semibold">Marca · Modelo</th>
                        <th className="px-5 py-4 font-semibold">Serie</th>
                        <th className="px-5 py-4 font-semibold">Responsable</th>
                        <th className="px-5 py-4 font-semibold">Sucursal · Área</th>
                        <th className="px-5 py-4 font-semibold text-right">Valor libros</th>
                        <th className="px-5 py-4 font-semibold">Últ. auditoría</th>
                        <th className="px-5 py-4 font-semibold">Estado</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                    {activos.map((a) => (
                        <tr key={a.id} onClick={() => abrir(a)} onKeyDown={(e) => e.key === "Enter" && abrir(a)} tabIndex={0} className="cursor-pointer hover:bg-white/5 focus:bg-white/10">
                            <td className="px-5 py-3 whitespace-nowrap">
                                <span className="font-semibold text-white">{a.codigo}</span>
                                <span className="block text-xs text-stone-400">{a.idActivo}</span>
                            </td>
                            <td className="px-5 py-3">
                                <span className="text-xs font-semibold tracking-wide text-brand-300">{a.tipoNombre}</span>
                                <span className="block text-stone-100">{a.descripcion}</span>
                            </td>
                            <td className="px-5 py-3 text-stone-300">{[a.marca, a.modelo].filter(Boolean).join(" · ") || "—"}</td>
                            <td className="px-5 py-3 font-mono text-xs text-stone-300">{a.serie || "—"}</td>
                            <td className="px-5 py-3 text-stone-200">{a.responsableNombre || <span className="text-stone-500">Sin responsable</span>}</td>
                            <td className="px-5 py-3 text-stone-300">{[a.sucursalNombre, a.areaNombre].filter(Boolean).join(" · ") || "—"}</td>
                            <td className="px-5 py-3 text-right font-semibold whitespace-nowrap text-white">{a.valorLibros == null ? "—" : formatoMonto(a.valorLibros)}</td>
                            <td className="px-5 py-3 whitespace-nowrap text-stone-300">
                                {a.noLocalizado ? (
                                    <span className="inline-flex items-center gap-1 text-red-300"><FaExclamationTriangle /> No localizado</span>
                                ) : a.ultimaAuditoria?.fecha ? formatoFecha(a.ultimaAuditoria.fecha) : <span className="text-stone-500">Nunca</span>}
                            </td>
                            <td className="px-5 py-3"><EstadoBadge estado={a.estado} /></td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
