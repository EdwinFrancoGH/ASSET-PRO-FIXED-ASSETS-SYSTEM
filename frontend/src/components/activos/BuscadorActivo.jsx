"use client";

import { useEffect, useRef, useState } from "react";
import { FaSearch } from "react-icons/fa";
import EstadoBadge from "./EstadoBadge";
import { obtenerActivos } from "../../services/activos.service";
import { claseInput } from "../ui/estilos";

// Buscador de activos (equivale a "BUSCAR ACTIVO FIJO" del Excel): escribe
// código, serie o descripción y elige de la lista.
export default function BuscadorActivo({ onSeleccionar, excluir = [], placeholder = "Buscar activo por código, serie o descripción…", autoFocus = false }) {
    const [q, setQ] = useState("");
    const [resultados, setResultados] = useState([]);
    const [abierto, setAbierto] = useState(false);
    const [cargando, setCargando] = useState(false);
    const caja = useRef(null);

    useEffect(() => {
        if (q.trim().length < 2) {
            setResultados([]);
            return;
        }
        setCargando(true);
        const t = setTimeout(() => {
            obtenerActivos({ q: q.trim() })
                .then(({ data }) => setResultados(data.data.slice(0, 12)))
                .catch(() => setResultados([]))
                .finally(() => setCargando(false));
        }, 300);
        return () => clearTimeout(t);
    }, [q]);

    useEffect(() => {
        const fuera = (e) => caja.current && !caja.current.contains(e.target) && setAbierto(false);
        document.addEventListener("mousedown", fuera);
        return () => document.removeEventListener("mousedown", fuera);
    }, []);

    const elegir = (a) => {
        onSeleccionar(a);
        setQ("");
        setResultados([]);
        setAbierto(false);
    };

    const visibles = resultados.filter((a) => !excluir.includes(a.id));

    return (
        <div ref={caja} className="relative">
            <FaSearch className="absolute left-3 top-1/2 mt-1 -translate-y-1/2 text-stone-400" />
            <input value={q} autoFocus={autoFocus} onChange={(e) => { setQ(e.target.value); setAbierto(true); }} onFocus={() => setAbierto(true)}
                placeholder={placeholder} aria-label="Buscar activo" className={`${claseInput} pl-9`} />
            {abierto && q.trim().length >= 2 && (
                <ul className="absolute z-30 mt-2 max-h-80 w-full overflow-y-auto rounded-2xl bg-stone-900/95 py-1 shadow-2xl ring-1 ring-white/15 backdrop-blur-xl">
                    {cargando && <li className="px-4 py-3 text-sm text-stone-400">Buscando…</li>}
                    {!cargando && visibles.length === 0 && <li className="px-4 py-3 text-sm text-stone-400">Sin resultados.</li>}
                    {!cargando && visibles.map((a) => (
                        <li key={a.id}>
                            <button type="button" onClick={() => elegir(a)} className="flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left hover:bg-white/10">
                                <span className="min-w-0">
                                    <span className="font-semibold text-white">{a.codigo}</span> <span className="text-stone-300">{a.descripcion}</span>
                                    <span className="block truncate text-xs text-stone-400">{[a.serie && `S/N ${a.serie}`, a.responsableNombre, a.areaNombre].filter(Boolean).join(" · ")}</span>
                                </span>
                                <EstadoBadge estado={a.estado} />
                            </button>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}
