"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import Swal from "sweetalert2";
import { FaArrowLeft, FaFilePdf, FaSave, FaLock, FaPlus, FaTrash, FaEdit, FaBoxes, FaExclamationTriangle, FaCheck } from "react-icons/fa";

import EncabezadoPagina from "../../../../components/ui/EncabezadoPagina";
import Seccion from "../../../../components/ui/Seccion";
import Cargando from "../../../../components/ui/Cargando";
import Dato from "../../../../components/ui/Dato";
import Modal from "../../../../components/ui/Modal";
import BuscadorActivo from "../../../../components/activos/BuscadorActivo";
import EstadoLevantamiento from "../../../../components/levantamientos/EstadoLevantamiento";
import EncabezadoForm from "../../../../components/levantamientos/EncabezadoForm";
import HallazgoModal from "../../../../components/levantamientos/HallazgoModal";
import { botonPrimario, botonSecundario } from "../../../../components/ui/estilos";
import { botonCabecera, botonVidrio, tarjeta } from "../../../../components/ui/tarjeta";
import { alertaError, toastExito, confirmar } from "../../../../components/ui/alertas";

import { obtenerLevantamiento, guardarLevantamiento, cerrarLevantamiento, eliminarLevantamiento, descargarActa } from "../../../../services/levantamientos.service";
import { obtenerActivos } from "../../../../services/activos.service";
import { obtenerTodosLosCatalogos } from "../../../../services/catalogos.service";
import { obtenerAuditores } from "../../../../services/users.service";
import { LISTA_CONDICIONES, INFO_CONDICION, INFO_ESTADO } from "../../../../utils/activos";
import { abrirBlob } from "../../../../utils/descargas";
import { formatoFecha, formatoFechaHora, mensajeError } from "../../../../utils/formato";

const lineaDeActivo = (a) => ({
    id: `n-${a.id}`, activoId: a.id, esHallazgo: false, encontrado: true, condicion: a.condicion || "BUENO", observaciones: "",
    codigo: a.codigo, idActivo: a.idActivo, tipoNombre: a.tipoNombre, descripcion: a.descripcion, marca: a.marca, modelo: a.modelo, serie: a.serie,
    responsableSistemaNombre: a.responsableNombre, areaSistemaNombre: a.areaNombre, sucursalSistemaNombre: a.sucursalNombre, estadoSistema: a.estado, diferencias: []
});

const paraEnviar = (l) => l.esHallazgo
    ? { id: l.id, esHallazgo: true, tipoId: l.tipoId, descripcion: l.descripcion, marca: l.marca, modelo: l.modelo, serie: l.serie, condicion: l.condicion, observaciones: l.observaciones }
    : { id: l.id, activoId: l.activoId, encontrado: l.encontrado, condicion: l.condicion, observaciones: l.observaciones };

export default function LevantamientoPage() {
    const { id } = useParams();
    const router = useRouter();
    const [lev, setLev] = useState(null);
    const [lineas, setLineas] = useState([]);
    const [cambios, setCambios] = useState(false);
    const [catalogos, setCatalogos] = useState({ tipos: [], sucursales: [], areas: [], asociados: [] });
    const [auditores, setAuditores] = useState([]);
    const [ocupado, setOcupado] = useState("");
    const [hallazgo, setHallazgo] = useState(null); // { indice } | { nuevo: true }
    const [encabezado, setEncabezado] = useState(null);

    const aplicar = (data) => {
        setLev(data);
        setLineas(data.lineas || []);
        setCambios(false);
    };

    const cargar = useCallback(() => {
        obtenerLevantamiento(id).then(({ data }) => aplicar(data.data)).catch((e) => {
            alertaError(mensajeError(e));
            router.replace("/levantamientos");
        });
    }, [id, router]);

    useEffect(() => {
        cargar();
        obtenerTodosLosCatalogos(true).then(setCatalogos).catch(() => {});
        obtenerAuditores().then(({ data }) => setAuditores(data.data)).catch(() => {});
    }, [cargar]);

    // Aviso al salir con cambios sin guardar.
    useEffect(() => {
        if (!cambios) return;
        const antes = (e) => { e.preventDefault(); e.returnValue = ""; };
        window.addEventListener("beforeunload", antes);
        return () => window.removeEventListener("beforeunload", antes);
    }, [cambios]);

    const resumen = useMemo(() => ({
        total: lineas.length,
        encontrados: lineas.filter((l) => !l.esHallazgo && l.encontrado).length,
        noEncontrados: lineas.filter((l) => !l.esHallazgo && !l.encontrado).length,
        hallazgos: lineas.filter((l) => l.esHallazgo).length,
        diferencias: lineas.filter((l) => l.encontrado && l.diferencias?.length).length
    }), [lineas]);

    if (!lev) return <Cargando />;
    const editable = lev.puedeEditar;

    const cambiarLinea = (i, campo, valor) => {
        setLineas((ls) => ls.map((l, k) => (k === i ? { ...l, [campo]: valor } : l)));
        setCambios(true);
    };
    const quitarLinea = (i) => { setLineas((ls) => ls.filter((_, k) => k !== i)); setCambios(true); };
    const agregarActivo = (a) => {
        if (a.estado === "BAJA") return alertaError(`${a.codigo} está dado de baja.`);
        setLineas((ls) => [...ls, lineaDeActivo(a)]);
        setCambios(true);
    };

    const agregarDelAlcance = async () => {
        setOcupado("alcance");
        try {
            const { data } = await obtenerActivos({ areaId: lev.areaId || "", sucursalId: lev.sucursalId || "", responsableId: lev.responsableId || "" });
            const ya = new Set(lineas.map((l) => l.activoId));
            const nuevos = data.data.filter((a) => !ya.has(a.id));
            if (!nuevos.length) toastExito("Todos los activos del alcance ya están en la lista.");
            else {
                setLineas((ls) => [...ls, ...nuevos.map(lineaDeActivo)]);
                setCambios(true);
                toastExito(`${nuevos.length} activos agregados.`);
            }
        } catch (e) {
            alertaError(mensajeError(e));
        } finally {
            setOcupado("");
        }
    };

    const guardar = async (extra = {}) => {
        setOcupado("guardar");
        try {
            const { data } = await guardarLevantamiento(id, { ...extra, lineas: lineas.map(paraEnviar) });
            aplicar(data.data);
            toastExito("Levantamiento guardado.");
            return true;
        } catch (e) {
            alertaError(mensajeError(e));
            return false;
        } finally {
            setOcupado("");
        }
    };

    const cerrar = async () => {
        if (!lineas.length) return alertaError("Agrega al menos un activo antes de cerrar.");
        if (cambios && !(await guardar())) return;
        const r = await Swal.fire({
            icon: resumen.noEncontrados ? "warning" : "question",
            title: `Cerrar ${lev.numero}`,
            html: `<p>${resumen.encontrados} encontrados · <b>${resumen.noEncontrados} no localizados</b> · ${resumen.hallazgos} hallazgos.</p>
                   <p style="margin-top:8px">Se actualizará el consolidado de activos: fecha y auditor de la última auditoría, condición, no localizados y alta de los hallazgos. Ya no podrá modificarse.</p>`,
            input: resumen.diferencias ? "checkbox" : undefined,
            inputValue: 1,
            inputPlaceholder: `Aplicar las ${resumen.diferencias} diferencias de ubicación/responsable (registra un Traslado)`,
            showCancelButton: true,
            confirmButtonText: "Cerrar levantamiento",
            cancelButtonText: "Cancelar",
            confirmButtonColor: "#d42a1c",
            reverseButtons: true
        });
        if (!r.isConfirmed) return;
        setOcupado("cerrar");
        try {
            const { data } = await cerrarLevantamiento(id, { aplicarDiferencias: resumen.diferencias ? r.value === 1 : false });
            aplicar(data.data);
            toastExito(data.message);
            if (data.data.avisosCierre?.length) alertaError(data.data.avisosCierre.join("\n"), "Algunos traslados no se aplicaron");
        } catch (e) {
            alertaError(mensajeError(e));
        } finally {
            setOcupado("");
        }
    };

    const acta = async () => {
        setOcupado("acta");
        try {
            abrirBlob(await descargarActa(id));
        } catch {
            alertaError("No se pudo generar el acta.");
        } finally {
            setOcupado("");
        }
    };

    const eliminar = async () => {
        if (!(await confirmar({ titulo: `Eliminar ${lev.numero}`, texto: "Se eliminará el levantamiento en proceso. Los activos no cambian.", confirmar: "Eliminar", peligro: true }))) return;
        try {
            await eliminarLevantamiento(id);
            toastExito("Levantamiento eliminado.");
            router.replace("/levantamientos");
        } catch (e) {
            alertaError(mensajeError(e));
        }
    };

    const guardarHallazgo = (d) => {
        const tipo = catalogos.tipos.find((t) => t.id === d.tipoId);
        const linea = { ...d, esHallazgo: true, encontrado: true, tipoNombre: tipo?.nombre || "", serie: d.serie.toUpperCase(), diferencias: [] };
        setLineas((ls) => (hallazgo?.indice !== undefined ? ls.map((l, k) => (k === hallazgo.indice ? { ...l, ...linea } : l)) : [...ls, { ...linea, id: `h-${Date.now()}` }]));
        setCambios(true);
        setHallazgo(null);
    };

    const guardarEncabezado = async (e) => {
        e.preventDefault();
        if (await guardar(encabezado)) setEncabezado(null);
    };

    return (
        <>
            <Link href="/levantamientos" className="mb-4 inline-flex items-center gap-2 text-sm text-stone-300 hover:text-white"><FaArrowLeft /> Levantamientos</Link>
            <EncabezadoPagina titulo={`Levantamiento ${lev.numero}`} descripcion={[lev.sucursalNombre, lev.areaNombre].filter(Boolean).join(" · ")}>
                <button onClick={acta} disabled={ocupado === "acta" || cambios} title={cambios ? "Guarda los cambios primero" : ""} className={botonVidrio}>
                    <FaFilePdf /> {ocupado === "acta" ? "Generando..." : lev.estado === "CERRADO" ? "Acta de validación" : "Vista previa del acta"}
                </button>
                {editable && (
                    <>
                        <button onClick={() => guardar()} disabled={!cambios || Boolean(ocupado)} className={botonVidrio}><FaSave /> {ocupado === "guardar" ? "Guardando..." : "Guardar"}</button>
                        <button onClick={cerrar} disabled={Boolean(ocupado)} className={botonCabecera}><FaLock /> {ocupado === "cerrar" ? "Cerrando..." : "Cerrar levantamiento"}</button>
                    </>
                )}
            </EncabezadoPagina>

            {cambios && (
                <div className="mb-6 flex items-center gap-3 rounded-2xl border border-amber-400/30 bg-amber-500/15 p-4 text-amber-100">
                    <FaExclamationTriangle className="text-amber-300" /> Tienes cambios sin guardar.
                </div>
            )}

            <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-5">
                {[
                    ["En la lista", resumen.total, "text-white"],
                    ["Encontrados", resumen.encontrados, "text-emerald-300"],
                    ["No localizados", resumen.noEncontrados, "text-red-300"],
                    ["Hallazgos", resumen.hallazgos, "text-sky-300"],
                    ["Con diferencias", resumen.diferencias, "text-amber-300"]
                ].map(([e, v, c]) => (
                    <div key={e} className={`${tarjeta} p-4`}>
                        <p className="text-sm text-stone-300">{e}</p>
                        <p className={`mt-1 text-3xl font-bold ${c}`}>{v}</p>
                    </div>
                ))}
            </div>

            <Seccion titulo="Datos del levantamiento" acciones={editable && (
                <button onClick={() => setEncabezado({
                    sucursalId: lev.sucursalId || "", areaId: lev.areaId || "", responsableId: lev.responsableId || "", liderId: lev.liderId || "",
                    auditorId: lev.auditorId, fecha: lev.fecha, observacionesGenerales: lev.observacionesGenerales || ""
                })} className="inline-flex items-center gap-2 text-sm font-medium text-brand-300 hover:underline"><FaEdit /> Editar</button>
            )}>
                <dl className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-4">
                    <Dato etiqueta="Estado"><EstadoLevantamiento estado={lev.estado} /></Dato>
                    <Dato etiqueta="Fecha de auditoría">{formatoFecha(lev.fecha)}</Dato>
                    <Dato etiqueta="Auditor">{lev.auditorNombre}</Dato>
                    <Dato etiqueta="Líder de área">{lev.liderNombre}</Dato>
                    <Dato etiqueta="Sucursal">{lev.sucursalNombre}</Dato>
                    <Dato etiqueta="Área">{lev.areaNombre}</Dato>
                    <Dato etiqueta="Responsable de los activos">{lev.responsableNombre || "Todos"}</Dato>
                    <Dato etiqueta={lev.estado === "CERRADO" ? "Cerrado" : "Creado"}>
                        {lev.estado === "CERRADO" ? `${lev.cerradoPorNombre} · ${formatoFechaHora(lev.fechaCierre)}` : `${lev.creadoPorNombre} · ${formatoFechaHora(lev.fechaCreacion)}`}
                    </Dato>
                    <Dato etiqueta="Observaciones generales" largo className="sm:col-span-2 lg:col-span-4">{lev.observacionesGenerales}</Dato>
                </dl>
            </Seccion>

            <Seccion titulo="Activos verificados" className="mt-6">
                {editable && (
                    <div className="mb-5 grid grid-cols-1 gap-3 lg:grid-cols-[1fr_auto_auto]">
                        <BuscadorActivo onSeleccionar={agregarActivo} excluir={lineas.map((l) => l.activoId).filter(Boolean)} />
                        <button onClick={agregarDelAlcance} disabled={ocupado === "alcance"} className="mt-2 inline-flex items-center justify-center gap-2 rounded-xl bg-white/10 px-4 py-3 font-medium text-stone-100 ring-1 ring-white/15 hover:bg-white/20">
                            <FaBoxes /> {ocupado === "alcance" ? "Cargando..." : "Agregar activos del área"}
                        </button>
                        <button onClick={() => setHallazgo({ nuevo: true })} className="mt-2 inline-flex items-center justify-center gap-2 rounded-xl bg-sky-500/15 px-4 py-3 font-medium text-sky-200 ring-1 ring-sky-400/30 hover:bg-sky-500/25">
                            <FaPlus /> Hallazgo
                        </button>
                    </div>
                )}

                {lineas.length === 0 ? (
                    <p className="rounded-2xl bg-white/5 p-8 text-center text-stone-300">Busca un activo para agregarlo o usa “Agregar activos del área”.</p>
                ) : (
                    <div className="-mx-5 overflow-x-auto sm:-mx-8">
                        <table className="w-full text-sm">
                            <thead className="bg-white/5 text-left text-stone-300">
                                <tr>
                                    <th className="px-4 py-3 font-semibold">Encontrado</th>
                                    <th className="px-4 py-3 font-semibold">Activo</th>
                                    <th className="px-4 py-3 font-semibold">Marca · Modelo · Serie</th>
                                    <th className="px-4 py-3 font-semibold">En el sistema</th>
                                    <th className="px-4 py-3 font-semibold">Condición</th>
                                    <th className="px-4 py-3 font-semibold">Observaciones</th>
                                    {editable && <th className="px-4 py-3"><span className="sr-only">Quitar</span></th>}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/10">
                                {lineas.map((l, i) => (
                                    <tr key={l.id} className={`align-top ${!l.encontrado ? "bg-red-500/10" : l.esHallazgo ? "bg-sky-500/10" : ""}`}>
                                        <td className="px-4 py-3">
                                            {l.esHallazgo ? <span className="rounded-full bg-sky-500/20 px-2 py-1 text-xs font-semibold text-sky-200">Hallazgo</span> : editable ? (
                                                <label className="inline-flex cursor-pointer items-center gap-2">
                                                    <input type="checkbox" checked={l.encontrado} onChange={(e) => cambiarLinea(i, "encontrado", e.target.checked)} className="h-5 w-5" aria-label={`${l.codigo} encontrado`} />
                                                    <span className={l.encontrado ? "text-emerald-300" : "text-red-300"}>{l.encontrado ? "Sí" : "No"}</span>
                                                </label>
                                            ) : l.encontrado ? <span className="inline-flex items-center gap-1 text-emerald-300"><FaCheck /> Sí</span> : <span className="text-red-300">No localizado</span>}
                                        </td>
                                        <td className="px-4 py-3">
                                            {l.activoId ? <Link href={`/activos/${l.activoId}`} className="font-semibold text-white hover:underline">{l.codigo}</Link> : <span className="font-semibold text-sky-200">Nuevo</span>}
                                            <span className="ml-2 text-xs font-semibold text-brand-300">{l.tipoNombre}</span>
                                            <span className="block text-stone-200">{l.descripcion}</span>
                                        </td>
                                        <td className="px-4 py-3 text-stone-300">{[l.marca, l.modelo].filter(Boolean).join(" · ") || "—"}<span className="block font-mono text-xs">{l.serie}</span></td>
                                        <td className="px-4 py-3 text-stone-300">
                                            {l.esHallazgo ? <span className="text-stone-500">No registrado</span> : (
                                                <>
                                                    <span className="block">{l.responsableSistemaNombre || "Sin responsable"}</span>
                                                    <span className="block text-xs text-stone-400">{[l.sucursalSistemaNombre, l.areaSistemaNombre].filter(Boolean).join(" · ")} · {INFO_ESTADO[l.estadoSistema]?.etiqueta}</span>
                                                </>
                                            )}
                                            {l.encontrado && l.diferencias?.map((d) => <span key={d} className="mt-1 block text-xs text-amber-300">⚠ {d}</span>)}
                                        </td>
                                        <td className="px-4 py-3">
                                            {editable && l.encontrado ? (
                                                <select value={l.condicion} onChange={(e) => cambiarLinea(i, "condicion", e.target.value)} aria-label="Condición" className="rounded-lg border border-white/15 bg-stone-900/40 p-2 text-stone-100">
                                                    {LISTA_CONDICIONES.map((c) => <option key={c} value={c}>{INFO_CONDICION[c].etiqueta}</option>)}
                                                </select>
                                            ) : l.encontrado ? <span className={INFO_CONDICION[l.condicion]?.clase}>{INFO_CONDICION[l.condicion]?.etiqueta}</span> : "—"}
                                        </td>
                                        <td className="px-4 py-3 min-w-48">
                                            {editable ? (
                                                <input value={l.observaciones || ""} onChange={(e) => cambiarLinea(i, "observaciones", e.target.value)} maxLength={500} aria-label="Observaciones" placeholder="—"
                                                    className="w-full rounded-lg border border-white/15 bg-stone-900/40 p-2 text-stone-100 placeholder:text-stone-500" />
                                            ) : <span className="text-stone-300">{l.observaciones || "—"}</span>}
                                        </td>
                                        {editable && (
                                            <td className="px-4 py-3 whitespace-nowrap text-right">
                                                {l.esHallazgo && <button onClick={() => setHallazgo({ indice: i })} className="rounded-lg p-2 text-sky-300 hover:bg-sky-500/10" aria-label="Editar hallazgo"><FaEdit /></button>}
                                                <button onClick={() => quitarLinea(i)} className="rounded-lg p-2 text-red-400 hover:bg-red-500/10" aria-label="Quitar de la lista"><FaTrash /></button>
                                            </td>
                                        )}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </Seccion>

            {lev.estado === "CERRADO" && lev.aplicoDiferencias && (
                <p className="mt-4 text-sm text-stone-400">Las diferencias de ubicación/responsable se aplicaron con movimientos de Traslado.</p>
            )}
            {editable && (
                <p className="mt-6 text-right">
                    <button onClick={eliminar} className="inline-flex items-center gap-2 text-sm text-red-400 hover:underline"><FaTrash /> Eliminar levantamiento</button>
                </p>
            )}

            <HallazgoModal abierto={Boolean(hallazgo)} tipos={catalogos.tipos} inicial={hallazgo?.indice !== undefined ? lineas[hallazgo.indice] : null} onCerrar={() => setHallazgo(null)} onGuardar={guardarHallazgo} />

            <Modal abierto={Boolean(encabezado)} titulo="Datos del levantamiento" onCerrar={() => !ocupado && setEncabezado(null)} ancho="max-w-4xl">
                {encabezado && (
                    <form onSubmit={guardarEncabezado} className="space-y-5">
                        <EncabezadoForm datos={encabezado} setDatos={setEncabezado} catalogos={catalogos} setCatalogos={setCatalogos} auditores={auditores} />
                        <div className="flex justify-end gap-3">
                            <button type="button" onClick={() => setEncabezado(null)} className={botonSecundario}>Cancelar</button>
                            <button type="submit" disabled={Boolean(ocupado)} className={botonPrimario}>{ocupado ? "Guardando..." : "Guardar"}</button>
                        </div>
                    </form>
                )}
            </Modal>
        </>
    );
}
