"use client";

import { useEffect, useMemo, useState } from "react";
import Modal from "../ui/Modal";
import Campo from "../ui/Campo";
import { claseInput, botonPrimario, botonSecundario, botonPeligro } from "../ui/estilos";
import { alertaError, toastExito, confirmar } from "../ui/alertas";
import { registrarMovimiento } from "../../services/activos.service";
import { TIPOS_MOVIMIENTO, INFO_ESTADO, LISTA_CONDICIONES, INFO_CONDICION } from "../../utils/activos";
import { hoyISO, mensajeError } from "../../utils/formato";

// Registrar un movimiento (hoja MOVIMIENTOS): solo se ofrecen los tipos
// permitidos para el estado actual del activo.
export default function MovimientoModal({ abierto, activo, catalogos, tipoInicial, onCerrar, onListo }) {
    const tiposPermitidos = useMemo(
        () => Object.entries(TIPOS_MOVIMIENTO).filter(([, v]) => activo && v.desde.includes(activo.estado)),
        [activo]
    );
    const [datos, setDatos] = useState({});
    const [guardando, setGuardando] = useState(false);

    useEffect(() => {
        if (!abierto || !activo) return;
        const tipo = tipoInicial && tiposPermitidos.some(([k]) => k === tipoInicial) ? tipoInicial : tiposPermitidos[0]?.[0] || "";
        setDatos({
            tipo,
            fecha: hoyISO(),
            sucursalId: activo.sucursalId || "",
            areaId: activo.areaId || "",
            ubicacion: activo.ubicacion || "",
            responsableId: "",
            fechaDevolucion: "",
            condicion: activo.condicion || "BUENO",
            comentario: ""
        });
    }, [abierto, activo, tipoInicial, tiposPermitidos]);

    if (!activo) return null;
    const def = TIPOS_MOVIMIENTO[datos.tipo] || {};
    const set = (campo) => (e) => setDatos((d) => ({ ...d, [campo]: e.target.value }));

    // Asociados: primero los del área destino.
    const asociados = [...(catalogos.asociados || [])].sort((a, b) => (b.areaId === datos.areaId) - (a.areaId === datos.areaId) || a.nombre.localeCompare(b.nombre));

    const guardar = async (e) => {
        e.preventDefault();
        if (def.peligro) {
            const ok = await confirmar({ titulo: `Dar de baja ${activo.codigo}`, texto: "La baja es definitiva: el activo sale del inventario y ya no admite movimientos.", confirmar: "Registrar baja", peligro: true });
            if (!ok) return;
        }
        setGuardando(true);
        try {
            const cuerpo = { tipo: datos.tipo, fecha: datos.fecha, comentario: datos.comentario };
            if (def.ubicacion) Object.assign(cuerpo, { sucursalId: datos.sucursalId, areaId: datos.areaId, ubicacion: datos.ubicacion });
            if (def.responsable && datos.responsableId) cuerpo.responsableId = datos.responsableId;
            if (def.devolucion) cuerpo.fechaDevolucion = datos.fechaDevolucion;
            if (def.condicion) cuerpo.condicion = datos.condicion;
            const { data } = await registrarMovimiento(activo.id, cuerpo);
            toastExito(data.message);
            onListo?.(data.data);
        } catch (err) {
            alertaError(mensajeError(err));
        } finally {
            setGuardando(false);
        }
    };

    return (
        <Modal abierto={abierto} titulo={`Movimiento · ${activo.codigo}`} onCerrar={() => !guardando && onCerrar()} ancho="max-w-2xl">
            <p className="mb-4 text-sm text-stone-300">
                {activo.descripcion} · Estado actual: <strong className="text-white">{INFO_ESTADO[activo.estado]?.etiqueta}</strong>
                {activo.responsableNombre && <> · Responsable: <strong className="text-white">{activo.responsableNombre}</strong></>}
            </p>
            {tiposPermitidos.length === 0 ? (
                <p className="rounded-xl bg-white/5 p-4 text-stone-300">Este activo está dado de baja: ya no admite movimientos.</p>
            ) : (
                <form onSubmit={guardar} className="space-y-4">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <Campo etiqueta="Tipo de movimiento" htmlFor="tipo" requerido ayuda={def.ayuda}>
                            <select id="tipo" value={datos.tipo} onChange={set("tipo")} className={claseInput}>
                                {tiposPermitidos.map(([k, v]) => <option key={k} value={k}>{v.etiqueta}</option>)}
                            </select>
                        </Campo>
                        <Campo etiqueta="Fecha" htmlFor="fecha" requerido>
                            <input id="fecha" type="date" max={hoyISO()} required value={datos.fecha || ""} onChange={set("fecha")} className={claseInput} />
                        </Campo>
                    </div>

                    {def.responsable && (
                        <Campo etiqueta={def.responsable === "opcional" ? "Nuevo responsable (opcional)" : "Asociado que recibe"} htmlFor="resp" requerido={def.responsable === true}>
                            <select id="resp" required={def.responsable === true} value={datos.responsableId} onChange={set("responsableId")} className={claseInput}>
                                <option value="">{def.responsable === "opcional" ? "Mantener el actual" : "Selecciona…"}</option>
                                {asociados.filter((a) => a.id !== activo.responsableId).map((a) => (
                                    <option key={a.id} value={a.id}>{a.nombre}{a.areaNombre ? ` — ${a.areaNombre}` : ""}</option>
                                ))}
                            </select>
                        </Campo>
                    )}

                    {def.ubicacion && (
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                            <Campo etiqueta="Sucursal destino" htmlFor="suc">
                                <select id="suc" value={datos.sucursalId} onChange={set("sucursalId")} className={claseInput}>
                                    <option value="">Sin sucursal</option>
                                    {catalogos.sucursales.map((s) => <option key={s.id} value={s.id}>{s.nombre}</option>)}
                                </select>
                            </Campo>
                            <Campo etiqueta="Área destino" htmlFor="area">
                                <select id="area" value={datos.areaId} onChange={set("areaId")} className={claseInput}>
                                    <option value="">Sin área</option>
                                    {catalogos.areas.map((a) => <option key={a.id} value={a.id}>{a.nombre}</option>)}
                                </select>
                            </Campo>
                            <Campo etiqueta="Ubicación" htmlFor="ubi" ayuda="Ej. Piso 2, Rack principal">
                                <input id="ubi" value={datos.ubicacion} onChange={set("ubicacion")} className={claseInput} />
                            </Campo>
                        </div>
                    )}

                    {def.devolucion && (
                        <Campo etiqueta="Fecha esperada de devolución" htmlFor="dev">
                            <input id="dev" type="date" min={datos.fecha} value={datos.fechaDevolucion} onChange={set("fechaDevolucion")} className={claseInput} />
                        </Campo>
                    )}

                    {def.condicion && (
                        <Campo etiqueta="Condición al regresar" htmlFor="cond">
                            <select id="cond" value={datos.condicion} onChange={set("condicion")} className={claseInput}>
                                {LISTA_CONDICIONES.map((c) => <option key={c} value={c}>{INFO_CONDICION[c].etiqueta}</option>)}
                            </select>
                        </Campo>
                    )}

                    <Campo etiqueta={def.peligro ? "Motivo de la baja" : "Comentario"} htmlFor="com" requerido={def.peligro}>
                        <textarea id="com" rows={3} required={def.peligro} minLength={def.peligro ? 5 : undefined} value={datos.comentario} onChange={set("comentario")} className={claseInput}
                            placeholder={def.peligro ? "Ej. Equipo obsoleto, sin reparación posible" : "Detalle del movimiento"} />
                    </Campo>

                    <div className="flex justify-end gap-3 pt-2">
                        <button type="button" onClick={onCerrar} disabled={guardando} className={botonSecundario}>Cancelar</button>
                        <button type="submit" disabled={guardando || !datos.tipo} className={def.peligro ? botonPeligro : botonPrimario}>
                            {guardando ? "Registrando..." : `Registrar ${(def.etiqueta || "").toLowerCase()}`}
                        </button>
                    </div>
                </form>
            )}
        </Modal>
    );
}
