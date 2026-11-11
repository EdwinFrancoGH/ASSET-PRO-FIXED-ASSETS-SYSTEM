"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { FiPlay, FiTrash2 } from "react-icons/fi";
import Modal from "../ui/Modal";
import Campo from "../ui/Campo";
import { claseInput, botonPrimario, botonSecundario } from "../ui/estilos";
import { alertaError, toastExito, confirmar } from "../ui/alertas";
import { crearVisita, actualizarVisita, eliminarVisita } from "../../services/programacion.service";
import { mensajeError } from "../../utils/formato";

const VACIA = { fecha: "", sucursalId: "", areaId: "", horaInicio: "08:00", horaFin: "", usuarioId: "", nota: "", estado: "PENDIENTE" };

// Alta / edición de una visita programada (qué día, en qué sucursal o área).
export default function VisitaModal({ visita, catalogos, usuarios, esGestion, usuarioPorDefecto, onCerrar, onGuardado }) {
    const [d, setD] = useState(VACIA);
    const [guardando, setGuardando] = useState(false);

    useEffect(() => {
        if (visita) setD({ ...VACIA, usuarioId: usuarioPorDefecto, ...visita, horaInicio: visita.horaInicio ?? (visita.id ? "" : VACIA.horaInicio), horaFin: visita.horaFin || "", sucursalId: visita.sucursalId || "", areaId: visita.areaId || "" });
    }, [visita, usuarioPorDefecto]);

    const set = (c) => (e) => setD((x) => ({ ...x, [c]: e.target.value }));

    const guardar = async (e) => {
        e.preventDefault();
        if (!d.sucursalId && !d.areaId) return alertaError("Elige la sucursal o el área que vas a levantar.");
        setGuardando(true);
        try {
            const cuerpo = { fecha: d.fecha, sucursalId: d.sucursalId, areaId: d.areaId, horaInicio: d.horaInicio, horaFin: d.horaFin, nota: d.nota, usuarioId: d.usuarioId };
            if (d.id) cuerpo.estado = d.estado;
            const { data } = d.id ? await actualizarVisita(d.id, cuerpo) : await crearVisita(cuerpo);
            toastExito(data.message);
            onGuardado();
        } catch (err) {
            alertaError(mensajeError(err));
        } finally {
            setGuardando(false);
        }
    };

    const borrar = async () => {
        if (!(await confirmar({ titulo: "Eliminar visita", texto: `Se quitará ${d.sucursalNombre || d.areaNombre} del ${d.fecha} de la programación.`, confirmar: "Eliminar", peligro: true }))) return;
        try {
            const { data } = await eliminarVisita(d.id);
            toastExito(data.message);
            onGuardado();
        } catch (err) {
            alertaError(mensajeError(err));
        }
    };

    const params = new URLSearchParams({ programacionId: d.id || "", ...(d.sucursalId && { sucursalId: d.sucursalId }), ...(d.areaId && { areaId: d.areaId }) });

    return (
        <Modal abierto={Boolean(visita)} titulo={d.id ? "Editar visita" : "Programar visita"} onCerrar={() => !guardando && onCerrar()} ancho="max-w-2xl">
            <form onSubmit={guardar} className="space-y-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <Campo etiqueta="Fecha" htmlFor="v-fecha" requerido>
                        <input id="v-fecha" type="date" required value={d.fecha} onChange={set("fecha")} className={claseInput} />
                    </Campo>
                    <Campo etiqueta="Hora de inicio" htmlFor="v-ini" ayuda="Vacío = todo el día.">
                        <input id="v-ini" type="time" value={d.horaInicio || ""} onChange={set("horaInicio")} className={claseInput} />
                    </Campo>
                    <Campo etiqueta="Hora de fin" htmlFor="v-fin">
                        <input id="v-fin" type="time" value={d.horaFin || ""} onChange={set("horaFin")} className={claseInput} />
                    </Campo>
                    <Campo etiqueta="Sucursal" htmlFor="v-suc" requerido={!d.areaId} className="sm:col-span-3 lg:col-span-1">
                        <select id="v-suc" value={d.sucursalId} onChange={set("sucursalId")} className={claseInput}>
                            <option value="">Sin sucursal</option>
                            {catalogos.sucursales.map((s) => <option key={s.id} value={s.id}>{s.nombre}{s.ciudad ? ` — ${s.ciudad}` : ""}</option>)}
                        </select>
                    </Campo>
                    <Campo etiqueta="Área" htmlFor="v-area" requerido={!d.sucursalId} className="sm:col-span-3 lg:col-span-1">
                        <select id="v-area" value={d.areaId} onChange={set("areaId")} className={claseInput}>
                            <option value="">Todas las áreas</option>
                            {catalogos.areas.map((a) => <option key={a.id} value={a.id}>{a.nombre}</option>)}
                        </select>
                    </Campo>
                    {esGestion ? (
                        <Campo etiqueta="Quién levanta" htmlFor="v-usr" className="sm:col-span-3 lg:col-span-1">
                            <select id="v-usr" value={d.usuarioId} onChange={set("usuarioId")} className={claseInput}>
                                {usuarios.map((u) => <option key={u.uid} value={u.uid}>{u.name} ({u.role})</option>)}
                            </select>
                        </Campo>
                    ) : <div className="hidden lg:block" />}
                    <Campo etiqueta="Nota" htmlFor="v-nota" className="sm:col-span-3" ayuda="Ej. llevar etiquetas QR, coordinar con el líder de área.">
                        <textarea id="v-nota" rows={2} maxLength={300} value={d.nota} onChange={set("nota")} className={claseInput} />
                    </Campo>
                    {d.id && (
                        <Campo etiqueta="Estado" htmlFor="v-est" className="sm:col-span-1">
                            <select id="v-est" value={d.estado} onChange={set("estado")} className={claseInput}>
                                <option value="PENDIENTE">Pendiente</option>
                                <option value="REALIZADA">Realizada</option>
                                <option value="CANCELADA">Cancelada</option>
                            </select>
                        </Campo>
                    )}
                </div>

                <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex flex-wrap gap-2">
                        {d.id && <button type="button" onClick={borrar} className="inline-flex items-center gap-2 rounded-xl px-4 py-3 font-semibold text-red-400 hover:bg-red-500/15"><FiTrash2 /> Eliminar</button>}
                        {d.id && d.estado === "PENDIENTE" && (
                            <Link href={`/levantamientos/nuevo?${params}`} className="inline-flex items-center gap-2 rounded-xl px-4 py-3 font-semibold text-brand-300 hover:bg-brand-500/10"><FiPlay /> Iniciar levantamiento</Link>
                        )}
                        {d.levantamientoId && <Link href={`/levantamientos/${d.levantamientoId}`} className="rounded-xl px-4 py-3 font-semibold text-brand-300 hover:bg-brand-500/10">Ver levantamiento</Link>}
                    </div>
                    <div className="flex gap-3">
                        <button type="button" onClick={onCerrar} disabled={guardando} className={botonSecundario}>Cancelar</button>
                        <button type="submit" disabled={guardando} className={botonPrimario}>{guardando ? "Guardando..." : "Guardar"}</button>
                    </div>
                </div>
            </form>
        </Modal>
    );
}
