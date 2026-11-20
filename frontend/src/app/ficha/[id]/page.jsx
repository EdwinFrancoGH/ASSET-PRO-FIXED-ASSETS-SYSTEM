"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { FaBoxOpen, FaMapMarkerAlt, FaUser, FaClipboardCheck, FaExclamationTriangle } from "react-icons/fa";
import LogoAssetPro from "../../../components/auth/LogoAssetPro";
import LogoElectrolab from "../../../components/auth/LogoElectrolab";
import EstadoBadge, { CondicionTexto } from "../../../components/activos/EstadoBadge";
import { formatoFecha } from "../../../utils/formato";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001/api";

// Ficha PÚBLICA del activo: la abre cualquiera que escanee la etiqueta QR.
// Solo lectura y aislada del sistema: sin sesión, sin menú y sin enlaces internos.
// Los datos vienen de GET /api/publico/activos/:id (campos limitados, sin valores).
function Dato({ etiqueta, children }) {
    return (
        <div>
            <p className="text-xs text-stone-400">{etiqueta}</p>
            <p className="font-medium text-stone-100 break-words">{children || "—"}</p>
        </div>
    );
}

export default function FichaPublicaPage() {
    const { id } = useParams();
    const [ficha, setFicha] = useState(null);
    const [error, setError] = useState("");

    useEffect(() => {
        let vivo = true;
        fetch(`${API}/publico/activos/${encodeURIComponent(id)}`)
            .then(async (r) => {
                const json = await r.json().catch(() => ({}));
                if (!r.ok) throw new Error(json.message || "No se pudo cargar la ficha.");
                if (vivo) setFicha(json.data);
            })
            .catch((e) => vivo && setError(e.message === "Failed to fetch" ? "No hay conexión con el servidor. Intenta de nuevo en unos segundos." : e.message));
        return () => { vivo = false; };
    }, [id]);

    const lugar = ficha ? [ficha.sucursal, ficha.area, ficha.ubicacion].filter(Boolean).join(" · ") : "";

    return (
        <div className="auth-fondo min-h-screen text-stone-100">
            <header className="mx-auto flex max-w-3xl items-center gap-3 px-4 pt-4 sm:pt-6">
                <div className="flex w-full items-center gap-3 rounded-2xl border border-white/10 bg-stone-900/50 px-4 py-3 backdrop-blur-md">
                    <LogoAssetPro className="h-9 w-9 flex-none" />
                    <div className="leading-tight">
                        <div className="text-lg font-bold tracking-tight">ASSET <span className="text-brand-500">PRO</span></div>
                        <div className="text-[11px] font-semibold tracking-wider text-brand-300">FICHA DEL ACTIVO</div>
                    </div>
                    <LogoElectrolab className="ml-auto border-l border-white/10 pl-3" />
                </div>
            </header>

            <main className="mx-auto max-w-3xl px-4 py-6">
                {error ? (
                    <div className="rounded-3xl border border-white/15 bg-stone-800/50 p-8 text-center backdrop-blur-xl">
                        <FaExclamationTriangle className="mx-auto mb-3 text-3xl text-amber-300" />
                        <p className="text-lg font-semibold">{error}</p>
                    </div>
                ) : !ficha ? (
                    <div className="flex items-center justify-center gap-3 py-24 text-stone-300">
                        <div className="h-6 w-6 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" /> Cargando ficha…
                    </div>
                ) : (
                    <article className="overflow-hidden rounded-3xl border border-white/15 bg-stone-800/50 shadow-2xl shadow-black/50 backdrop-blur-xl">
                        <div className="flex flex-col gap-5 p-5 sm:flex-row sm:p-8">
                            <div className="flex h-48 w-full flex-none items-center justify-center overflow-hidden rounded-2xl bg-white/5 ring-1 ring-white/10 sm:h-44 sm:w-44">
                                {ficha.foto ? <img src={ficha.foto} alt={ficha.descripcion} className="h-full w-full object-cover" /> : <FaBoxOpen className="text-5xl text-stone-500" />}
                            </div>
                            <div className="min-w-0 flex-1">
                                <p className="text-xs font-bold tracking-wider text-brand-300">{ficha.tipo}</p>
                                <h1 className="text-3xl font-bold">{ficha.codigo}</h1>
                                <p className="text-lg text-stone-200">{ficha.descripcion}</p>
                                <p className="mt-1 text-sm text-stone-400">{ficha.idActivo}</p>
                                <div className="mt-3 flex flex-wrap items-center gap-3">
                                    <EstadoBadge estado={ficha.estado} />
                                    {ficha.condicion && <span className="text-sm">Condición: <CondicionTexto condicion={ficha.condicion} /></span>}
                                </div>
                            </div>
                        </div>

                        {ficha.noLocalizado && (
                            <div className="mx-5 mb-4 flex items-start gap-3 rounded-2xl bg-red-500/15 p-4 text-sm text-red-100 ring-1 ring-red-400/30 sm:mx-8">
                                <FaExclamationTriangle className="mt-0.5 flex-none" />
                                Este activo figura como <strong>no localizado</strong> en el último levantamiento. Si lo encontraste, avisa al área de Inventario.
                            </div>
                        )}

                        <div className="grid grid-cols-2 gap-x-6 gap-y-4 border-t border-white/10 p-5 sm:grid-cols-3 sm:p-8">
                            <Dato etiqueta="Marca">{ficha.marca}</Dato>
                            <Dato etiqueta="Modelo">{ficha.modelo}</Dato>
                            <Dato etiqueta="N.º de serie">{ficha.serie}</Dato>
                        </div>

                        <div className="space-y-3 border-t border-white/10 p-5 sm:p-8">
                            <p className="flex items-start gap-3"><FaMapMarkerAlt className="mt-1 flex-none text-brand-300" /><span><span className="block text-xs text-stone-400">Ubicación</span>{lugar || "—"}</span></p>
                            <p className="flex items-start gap-3"><FaUser className="mt-1 flex-none text-brand-300" /><span><span className="block text-xs text-stone-400">Responsable</span>{ficha.responsable || "Sin asignar (en inventario)"}</span></p>
                            <p className="flex items-start gap-3"><FaClipboardCheck className="mt-1 flex-none text-brand-300" /><span><span className="block text-xs text-stone-400">Último levantamiento</span>{ficha.ultimaAuditoria ? `${formatoFecha(ficha.ultimaAuditoria.fecha)} · ${ficha.ultimaAuditoria.encontrado ? "verificado" : "no localizado"}` : "Aún no auditado"}</span></p>
                        </div>
                    </article>
                )}
                <p className="mt-6 text-center text-xs text-stone-400">
                    Ficha informativa de solo lectura · Activo fijo propiedad de Electrolab Medic.<br />Si este equipo está extraviado o dañado, repórtalo al área de Inventario.
                </p>
            </main>
        </div>
    );
}
