"use client";

import { useCallback, useEffect, useState } from "react";
import { FaFileExcel, FaPlus } from "react-icons/fa";

import EncabezadoPagina from "../../../components/ui/EncabezadoPagina";
import Cargando from "../../../components/ui/Cargando";
import Modal from "../../../components/ui/Modal";
import TablaMovimientos from "../../../components/activos/TablaMovimientos";
import MovimientoModal from "../../../components/activos/MovimientoModal";
import BuscadorActivo from "../../../components/activos/BuscadorActivo";
import { claseInput } from "../../../components/ui/estilos";
import { tablaCaja, botonCabecera, botonExcel } from "../../../components/ui/tarjeta";
import { alertaError, toastExito } from "../../../components/ui/alertas";

import { useAuth } from "../../../context/AuthContext";
import { obtenerMovimientos, exportarMovimientos } from "../../../services/activos.service";
import { obtenerTodosLosCatalogos } from "../../../services/catalogos.service";
import { ROLES_GESTION } from "../../../utils/roles";
import { ETIQUETAS_MOVIMIENTO } from "../../../utils/activos";
import { descargarBlob } from "../../../utils/descargas";
import { mensajeError } from "../../../utils/formato";

const VACIOS = { q: "", tipo: "", desde: "", hasta: "" };

export default function MovimientosPage() {
    const { userRole } = useAuth();
    const esGestion = ROLES_GESTION.includes(userRole);
    const [filtros, setFiltros] = useState(VACIOS);
    const [movimientos, setMovimientos] = useState(null);
    const [catalogos, setCatalogos] = useState({ tipos: [], sucursales: [], areas: [], asociados: [] });
    const [eligiendo, setEligiendo] = useState(false);
    const [activo, setActivo] = useState(null);
    const [exportando, setExportando] = useState(false);

    const cargar = useCallback(async () => {
        setMovimientos(null);
        try {
            const { data } = await obtenerMovimientos(filtros);
            setMovimientos(data.data);
        } catch (e) {
            setMovimientos([]);
            alertaError(mensajeError(e, "No se pudieron cargar los movimientos."));
        }
    }, [filtros]);

    useEffect(() => {
        const t = setTimeout(cargar, filtros.q ? 350 : 0);
        return () => clearTimeout(t);
    }, [cargar, filtros.q]);

    useEffect(() => {
        if (esGestion) obtenerTodosLosCatalogos(true).then(setCatalogos).catch(() => {});
    }, [esGestion]);

    const cambiar = (e) => setFiltros((f) => ({ ...f, [e.target.name]: e.target.value }));

    const exportar = async () => {
        setExportando(true);
        try {
            descargarBlob(await exportarMovimientos(filtros), "movimientos-activos.xlsx");
            toastExito("Excel descargado.");
        } catch {
            alertaError("No se pudo generar el Excel.");
        } finally {
            setExportando(false);
        }
    };

    return (
        <>
            <EncabezadoPagina titulo="Movimientos de activos" descripcion="Cada asignación, traslado, préstamo, mantenimiento o baja queda registrado con quién y cuándo.">
                <button onClick={exportar} disabled={exportando || !movimientos?.length} className={botonExcel}><FaFileExcel /> {exportando ? "Generando..." : "Descargar Excel"}</button>
                {esGestion && <button onClick={() => setEligiendo(true)} className={botonCabecera}><FaPlus /> Registrar movimiento</button>}
            </EncabezadoPagina>

            <div className={tablaCaja}>
                <div className="grid grid-cols-1 gap-3 border-b p-5 sm:grid-cols-2 lg:grid-cols-5">
                    <input name="q" value={filtros.q} onChange={cambiar} placeholder="Activo, responsable, comentario…" aria-label="Buscar" className={`${claseInput} lg:col-span-2`} />
                    <select name="tipo" value={filtros.tipo} onChange={cambiar} className={claseInput} aria-label="Tipo de movimiento">
                        <option value="">Todos los tipos</option>
                        {Object.entries(ETIQUETAS_MOVIMIENTO).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                    </select>
                    <input type="date" name="desde" value={filtros.desde} onChange={cambiar} aria-label="Desde" className={claseInput} />
                    <input type="date" name="hasta" value={filtros.hasta} onChange={cambiar} aria-label="Hasta" className={claseInput} />
                </div>
                {movimientos === null ? <Cargando /> : <TablaMovimientos movimientos={movimientos} />}
            </div>

            <Modal abierto={eligiendo} titulo="¿A qué activo?" onCerrar={() => setEligiendo(false)}>
                <BuscadorActivo autoFocus onSeleccionar={(a) => { setEligiendo(false); setActivo(a); }} />
                <p className="mt-3 text-sm text-stone-400">Escribe al menos 2 caracteres del código, la serie o la descripción.</p>
            </Modal>

            <MovimientoModal abierto={Boolean(activo)} activo={activo} catalogos={catalogos} onCerrar={() => setActivo(null)} onListo={() => { setActivo(null); cargar(); }} />
        </>
    );
}
