"use client";

import { useState } from "react";
import { FaUserPlus } from "react-icons/fa";
import Campo from "../ui/Campo";
import NuevoAsociadoModal from "./NuevoAsociadoModal";
import { claseInput } from "../ui/estilos";
import { hoyISO } from "../../utils/formato";

// Encabezado del levantamiento (G2:H8 de AUDITORIA_AF): sucursal/área,
// responsable del activo, líder de área, auditor y fecha.
export default function EncabezadoForm({ datos, setDatos, catalogos, setCatalogos, auditores }) {
    const [nuevoAsociado, setNuevoAsociado] = useState(null);
    const set = (c) => (e) => setDatos((d) => ({ ...d, [c]: e.target.value }));

    const cambiarArea = (e) => {
        const area = catalogos.areas.find((a) => a.id === e.target.value);
        setDatos((d) => ({ ...d, areaId: e.target.value, liderId: area?.liderId || d.liderId }));
    };

    const asociados = [...catalogos.asociados].sort((a, b) => (b.areaId === datos.areaId) - (a.areaId === datos.areaId) || a.nombre.localeCompare(b.nombre));
    const opcion = (a) => <option key={a.id} value={a.id}>{a.nombre}{a.areaNombre ? ` — ${a.areaNombre}` : ""}</option>;

    return (
        <>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                <Campo etiqueta="Sucursal" htmlFor="l-suc" requerido={!datos.areaId}>
                    <select id="l-suc" value={datos.sucursalId} onChange={set("sucursalId")} className={claseInput}>
                        <option value="">Todas / sin sucursal</option>
                        {catalogos.sucursales.map((s) => <option key={s.id} value={s.id}>{s.nombre}</option>)}
                    </select>
                </Campo>
                <Campo etiqueta="Área" htmlFor="l-area" requerido={!datos.sucursalId} ayuda="Al elegirla se propone su líder de área.">
                    <select id="l-area" value={datos.areaId} onChange={cambiarArea} className={claseInput}>
                        <option value="">Todas / sin área</option>
                        {catalogos.areas.map((a) => <option key={a.id} value={a.id}>{a.nombre}</option>)}
                    </select>
                </Campo>
                <Campo etiqueta="Fecha de auditoría" htmlFor="l-fecha" requerido>
                    <input id="l-fecha" type="date" required max={hoyISO()} value={datos.fecha} onChange={set("fecha")} className={claseInput} />
                </Campo>
                <Campo etiqueta="Responsable de los activos (opcional)" htmlFor="l-resp" ayuda="Si lo indicas, se levantan solo sus activos.">
                    <div className="flex gap-2">
                        <select id="l-resp" value={datos.responsableId} onChange={set("responsableId")} className={claseInput}>
                            <option value="">Todos los responsables</option>
                            {asociados.map(opcion)}
                        </select>
                        <button type="button" onClick={() => setNuevoAsociado("responsableId")} title="Nuevo asociado" aria-label="Nuevo asociado" className="mt-2 flex-none rounded-lg bg-white/10 px-3 text-stone-200 hover:bg-white/20"><FaUserPlus /></button>
                    </div>
                </Campo>
                <Campo etiqueta="Líder de área" htmlFor="l-lider" ayuda="Firma el acta de validación.">
                    <div className="flex gap-2">
                        <select id="l-lider" value={datos.liderId} onChange={set("liderId")} className={claseInput}>
                            <option value="">Sin definir</option>
                            {asociados.map(opcion)}
                        </select>
                        <button type="button" onClick={() => setNuevoAsociado("liderId")} title="Nuevo asociado" aria-label="Nuevo asociado" className="mt-2 flex-none rounded-lg bg-white/10 px-3 text-stone-200 hover:bg-white/20"><FaUserPlus /></button>
                    </div>
                </Campo>
                <Campo etiqueta="Auditor" htmlFor="l-aud" requerido>
                    <select id="l-aud" required value={datos.auditorId} onChange={set("auditorId")} className={claseInput}>
                        {auditores.map((u) => <option key={u.uid} value={u.uid}>{u.name} ({u.role})</option>)}
                    </select>
                </Campo>
                <Campo etiqueta="Observaciones generales" htmlFor="l-obs" className="sm:col-span-2 lg:col-span-3" ayuda="Aparecen en la sección OBSERVACIONES del acta.">
                    <textarea id="l-obs" rows={2} value={datos.observacionesGenerales} onChange={set("observacionesGenerales")} className={claseInput} />
                </Campo>
            </div>

            <NuevoAsociadoModal
                abierto={Boolean(nuevoAsociado)}
                catalogos={catalogos}
                inicial={{ areaId: datos.areaId, sucursalId: datos.sucursalId }}
                onCerrar={() => setNuevoAsociado(null)}
                onCreado={(a) => {
                    setCatalogos((c) => ({ ...c, asociados: [...c.asociados, a] }));
                    setDatos((d) => ({ ...d, [nuevoAsociado]: a.id }));
                    setNuevoAsociado(null);
                }}
            />
        </>
    );
}
