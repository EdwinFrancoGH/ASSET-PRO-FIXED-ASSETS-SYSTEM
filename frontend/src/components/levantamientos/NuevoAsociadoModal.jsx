"use client";

import { useState } from "react";
import Modal from "../ui/Modal";
import Campo from "../ui/Campo";
import { claseInput, botonPrimario, botonSecundario } from "../ui/estilos";
import { alertaError, toastExito } from "../ui/alertas";
import { registrarAsociado } from "../../services/catalogos.service";
import { mensajeError } from "../../utils/formato";

// Equivale al formulario "frmNuevoAsociado" del Excel (nombre + área/sucursal).
export default function NuevoAsociadoModal({ abierto, catalogos, inicial = {}, onCerrar, onCreado }) {
    const [datos, setDatos] = useState({ nombre: "", cargo: "", areaId: "", sucursalId: "" });
    const [guardando, setGuardando] = useState(false);
    const valor = { ...datos, areaId: datos.areaId || inicial.areaId || "", sucursalId: datos.sucursalId || inicial.sucursalId || "" };
    const set = (c) => (e) => setDatos((d) => ({ ...d, [c]: e.target.value }));

    const guardar = async (e) => {
        e.preventDefault();
        setGuardando(true);
        try {
            const { data } = await registrarAsociado(valor);
            toastExito(data.message);
            setDatos({ nombre: "", cargo: "", areaId: "", sucursalId: "" });
            onCreado(data.data);
        } catch (err) {
            alertaError(mensajeError(err));
        } finally {
            setGuardando(false);
        }
    };

    return (
        <Modal abierto={abierto} titulo="Nuevo asociado" onCerrar={() => !guardando && onCerrar()}>
            <form onSubmit={guardar} className="space-y-4">
                <Campo etiqueta="Nombre" htmlFor="na-nombre" requerido>
                    <input id="na-nombre" required minLength={2} autoFocus value={valor.nombre} onChange={set("nombre")} className={`${claseInput} uppercase`} />
                </Campo>
                <Campo etiqueta="Cargo" htmlFor="na-cargo">
                    <input id="na-cargo" value={valor.cargo} onChange={set("cargo")} className={claseInput} />
                </Campo>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <Campo etiqueta="Área" htmlFor="na-area">
                        <select id="na-area" value={valor.areaId} onChange={set("areaId")} className={claseInput}>
                            <option value="">Sin área</option>
                            {catalogos.areas.map((a) => <option key={a.id} value={a.id}>{a.nombre}</option>)}
                        </select>
                    </Campo>
                    <Campo etiqueta="Sucursal" htmlFor="na-suc">
                        <select id="na-suc" value={valor.sucursalId} onChange={set("sucursalId")} className={claseInput}>
                            <option value="">Sin sucursal</option>
                            {catalogos.sucursales.map((s) => <option key={s.id} value={s.id}>{s.nombre}</option>)}
                        </select>
                    </Campo>
                </div>
                <div className="flex justify-end gap-3 pt-2">
                    <button type="button" onClick={onCerrar} disabled={guardando} className={botonSecundario}>Cancelar</button>
                    <button type="submit" disabled={guardando} className={botonPrimario}>{guardando ? "Guardando..." : "Agregar asociado"}</button>
                </div>
            </form>
        </Modal>
    );
}
