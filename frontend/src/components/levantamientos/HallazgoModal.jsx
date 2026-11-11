"use client";

import { useEffect, useState } from "react";
import Modal from "../ui/Modal";
import Campo from "../ui/Campo";
import { claseInput, botonPrimario, botonSecundario } from "../ui/estilos";
import { LISTA_CONDICIONES, INFO_CONDICION } from "../../utils/activos";

const VACIO = { tipoId: "", descripcion: "", marca: "", modelo: "", serie: "", condicion: "BUENO", observaciones: "" };

// Activo encontrado en sitio que no está en el consolidado. Al cerrar el
// levantamiento se registra como activo nuevo (como "GuardarEnMain").
export default function HallazgoModal({ abierto, tipos, inicial, onCerrar, onGuardar }) {
    const [d, setD] = useState(VACIO);
    useEffect(() => { if (abierto) setD({ ...VACIO, ...(inicial || {}) }); }, [abierto, inicial]);
    const set = (c) => (e) => setD((x) => ({ ...x, [c]: e.target.value }));

    return (
        <Modal abierto={abierto} titulo={inicial ? "Editar hallazgo" : "Agregar hallazgo (activo no registrado)"} onCerrar={onCerrar} ancho="max-w-2xl">
            <form onSubmit={(e) => { e.preventDefault(); onGuardar(d); }} className="space-y-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <Campo etiqueta="Equipo" htmlFor="h-tipo" requerido>
                        <select id="h-tipo" required value={d.tipoId} onChange={set("tipoId")} className={claseInput}>
                            <option value="">Selecciona…</option>
                            {tipos.map((t) => <option key={t.id} value={t.id}>{t.nombre}</option>)}
                        </select>
                    </Campo>
                    <Campo etiqueta="Condición" htmlFor="h-cond">
                        <select id="h-cond" value={d.condicion} onChange={set("condicion")} className={claseInput}>
                            {LISTA_CONDICIONES.map((c) => <option key={c} value={c}>{INFO_CONDICION[c].etiqueta}</option>)}
                        </select>
                    </Campo>
                    <Campo etiqueta="Descripción" htmlFor="h-desc" requerido className="sm:col-span-2">
                        <input id="h-desc" required minLength={3} value={d.descripcion} onChange={set("descripcion")} className={claseInput} />
                    </Campo>
                    <Campo etiqueta="Marca" htmlFor="h-marca"><input id="h-marca" value={d.marca} onChange={set("marca")} className={claseInput} /></Campo>
                    <Campo etiqueta="Modelo" htmlFor="h-modelo"><input id="h-modelo" value={d.modelo} onChange={set("modelo")} className={claseInput} /></Campo>
                    <Campo etiqueta="Serie" htmlFor="h-serie"><input id="h-serie" value={d.serie} onChange={set("serie")} className={`${claseInput} font-mono uppercase`} /></Campo>
                    <Campo etiqueta="Observaciones" htmlFor="h-obs"><input id="h-obs" value={d.observaciones} onChange={set("observaciones")} className={claseInput} /></Campo>
                </div>
                <p className="text-sm text-stone-400">Al cerrar el levantamiento se registrará con el responsable, área y sucursal del encabezado.</p>
                <div className="flex justify-end gap-3">
                    <button type="button" onClick={onCerrar} className={botonSecundario}>Cancelar</button>
                    <button type="submit" className={botonPrimario}>Guardar hallazgo</button>
                </div>
            </form>
        </Modal>
    );
}
