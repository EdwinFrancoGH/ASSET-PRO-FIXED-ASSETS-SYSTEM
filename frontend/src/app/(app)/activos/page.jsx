"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { FaFileExcel, FaPlus, FaSearch } from "react-icons/fa";

import EncabezadoPagina from "../../../components/ui/EncabezadoPagina";
import Cargando from "../../../components/ui/Cargando";
import TablaActivos from "../../../components/activos/TablaActivos";
import { claseInput } from "../../../components/ui/estilos";
import { tablaCaja, botonCabecera, botonExcel } from "../../../components/ui/tarjeta";
import { alertaError, toastExito } from "../../../components/ui/alertas";

import { useAuth } from "../../../context/AuthContext";
import { obtenerActivos, exportarActivos } from "../../../services/activos.service";
import { obtenerTodosLosCatalogos } from "../../../services/catalogos.service";
import { ROLES_GESTION } from "../../../utils/roles";
import { INFO_ESTADO, LISTA_ESTADOS } from "../../../utils/activos";
import { descargarBlob } from "../../../utils/descargas";
import { formatoMonto, mensajeError } from "../../../utils/formato";

const VACIOS = { q: "", estado: "", tipoId: "", sucursalId: "", areaId: "", responsableId: "", sinAuditar: "", noLocalizado: "", incluirBajas: "" };

function Activos() {
    const { userRole } = useAuth();
    const sp = useSearchParams();
    const esGestion = ROLES_GESTION.includes(userRole);
    const [filtros, setFiltros] = useState(() => ({
        ...VACIOS,
        ...Object.fromEntries(Object.keys(VACIOS).map((k) => [k, sp.get(k) || ""]))
    }));
    const [activos, setActivos] = useState(null);
    const [catalogos, setCatalogos] = useState({ tipos: [], sucursales: [], areas: [], asociados: [] });
    const [exportando, setExportando] = useState(false);

    const cargar = useCallback(async () => {
        setActivos(null);
        try {
            const { data } = await obtenerActivos(filtros);
            setActivos(data.data);
        } catch (e) {
            setActivos([]);
            alertaError(mensajeError(e, "No se pudieron cargar los activos."));
        }
    }, [filtros]);

    useEffect(() => {
        const t = setTimeout(cargar, filtros.q ? 350 : 0);
        return () => clearTimeout(t);
    }, [cargar, filtros.q]);

    useEffect(() => {
        obtenerTodosLosCatalogos(false).then(setCatalogos).catch(() => {});
    }, []);

    const cambiar = (e) => setFiltros((f) => ({ ...f, [e.target.name]: e.target.type === "checkbox" ? (e.target.checked ? "true" : "") : e.target.value }));

    const exportar = async () => {
        setExportando(true);
        try {
            descargarBlob(await exportarActivos(filtros), "consolidado-activos.xlsx");
            toastExito("Excel descargado.");
        } catch {
            alertaError("No se pudo generar el Excel.");
        } finally {
            setExportando(false);
        }
    };

    const valorTotal = (activos || []).reduce((s, a) => s + (Number(a.valorCompra) || 0), 0);
    const librosTotal = (activos || []).reduce((s, a) => s + (Number(a.valorLibros) || 0), 0);
    const hayFiltros = Object.values(filtros).some(Boolean);

    return (
        <>
            <EncabezadoPagina titulo="Consolidado de activos" descripcion="Busca por código, serie, descripción o responsable y filtra por sucursal, área o estado.">
                <button onClick={exportar} disabled={exportando || !activos?.length} className={botonExcel}>
                    <FaFileExcel /> {exportando ? "Generando..." : "Descargar Excel"}
                </button>
                {esGestion && <Link href="/activos/nuevo" className={botonCabecera}><FaPlus /> Nuevo activo</Link>}
            </EncabezadoPagina>

            <div className={tablaCaja}>
                <div className="grid grid-cols-1 gap-3 border-b p-5 sm:grid-cols-2 lg:grid-cols-6">
                    <label className="relative lg:col-span-2">
                        <span className="sr-only">Buscar</span>
                        <FaSearch className="absolute left-3 top-1/2 mt-1 -translate-y-1/2 text-stone-400" />
                        <input name="q" value={filtros.q} onChange={cambiar} placeholder="Código, serie, descripción, responsable…" className={`${claseInput} pl-9`} />
                    </label>
                    <select name="estado" value={filtros.estado} onChange={cambiar} className={claseInput} aria-label="Estado">
                        <option value="">Todos los estados (sin bajas)</option>
                        {LISTA_ESTADOS.map((e) => <option key={e} value={e}>{INFO_ESTADO[e].etiqueta}</option>)}
                    </select>
                    <select name="tipoId" value={filtros.tipoId} onChange={cambiar} className={claseInput} aria-label="Tipo">
                        <option value="">Todos los equipos</option>
                        {catalogos.tipos.map((t) => <option key={t.id} value={t.id}>{t.nombre}</option>)}
                    </select>
                    <select name="sucursalId" value={filtros.sucursalId} onChange={cambiar} className={claseInput} aria-label="Sucursal">
                        <option value="">Todas las sucursales</option>
                        {catalogos.sucursales.map((s) => <option key={s.id} value={s.id}>{s.nombre}</option>)}
                    </select>
                    <select name="areaId" value={filtros.areaId} onChange={cambiar} className={claseInput} aria-label="Área">
                        <option value="">Todas las áreas</option>
                        {catalogos.areas.map((a) => <option key={a.id} value={a.id}>{a.nombre}</option>)}
                    </select>
                    <select name="responsableId" value={filtros.responsableId} onChange={cambiar} className={`${claseInput} lg:col-span-2`} aria-label="Responsable">
                        <option value="">Todos los responsables</option>
                        {catalogos.asociados.map((a) => <option key={a.id} value={a.id}>{a.nombre}</option>)}
                    </select>
                    <div className="flex flex-wrap items-center gap-x-5 gap-y-2 pt-2 text-sm text-stone-200 lg:col-span-4">
                        <label className="flex items-center gap-2"><input type="checkbox" name="sinAuditar" checked={filtros.sinAuditar === "true"} onChange={cambiar} className="h-4 w-4" /> Sin auditar (+180 días)</label>
                        <label className="flex items-center gap-2"><input type="checkbox" name="noLocalizado" checked={filtros.noLocalizado === "true"} onChange={cambiar} className="h-4 w-4" /> No localizados</label>
                        <label className="flex items-center gap-2"><input type="checkbox" name="incluirBajas" checked={filtros.incluirBajas === "true"} onChange={cambiar} className="h-4 w-4" /> Incluir bajas</label>
                        {hayFiltros && <button onClick={() => setFiltros(VACIOS)} className="text-brand-300 hover:underline">Limpiar filtros</button>}
                    </div>
                </div>

                {activos && (
                    <div className="flex flex-wrap gap-x-6 gap-y-1 border-b px-5 py-3 text-sm text-stone-300">
                        <span><strong className="text-white">{activos.length}</strong> activos</span>
                        <span>Valor de compra: <strong className="text-white">{formatoMonto(valorTotal)}</strong></span>
                        <span>Valor en libros: <strong className="text-white">{formatoMonto(librosTotal)}</strong></span>
                    </div>
                )}

                {activos === null ? <Cargando /> : <TablaActivos activos={activos} vacio={hayFiltros ? "Ningún activo coincide con los filtros." : "Aún no hay activos registrados."} />}
            </div>
        </>
    );
}

export default function ActivosPage() {
    return (
        <Suspense fallback={<Cargando />}>
            <Activos />
        </Suspense>
    );
}
