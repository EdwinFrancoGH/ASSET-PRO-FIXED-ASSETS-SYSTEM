"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { FaEdit, FaExchangeAlt, FaQrcode, FaTrash, FaBox, FaExclamationTriangle, FaArrowLeft } from "react-icons/fa";

import EncabezadoPagina from "../../../../components/ui/EncabezadoPagina";
import Seccion from "../../../../components/ui/Seccion";
import Cargando from "../../../../components/ui/Cargando";
import Dato from "../../../../components/ui/Dato";
import EstadoBadge, { CondicionTexto } from "../../../../components/activos/EstadoBadge";
import TablaMovimientos from "../../../../components/activos/TablaMovimientos";
import MovimientoModal from "../../../../components/activos/MovimientoModal";
import EtiquetaQR from "../../../../components/activos/EtiquetaQR";
import { botonCabecera, botonVidrio } from "../../../../components/ui/tarjeta";
import { alertaError, toastExito, confirmar } from "../../../../components/ui/alertas";

import { useAuth } from "../../../../context/AuthContext";
import { obtenerActivo, eliminarActivo } from "../../../../services/activos.service";
import { obtenerTodosLosCatalogos } from "../../../../services/catalogos.service";
import { ROLES, ROLES_GESTION } from "../../../../utils/roles";
import { INFO_CONDICION } from "../../../../utils/activos";
import { formatoMonto, formatoFecha, formatoFechaHora, mensajeError } from "../../../../utils/formato";

export default function ActivoDetallePage() {
    const { id } = useParams();
    const router = useRouter();
    const { userRole } = useAuth();
    const esGestion = ROLES_GESTION.includes(userRole);

    const [activo, setActivo] = useState(null);
    const [catalogos, setCatalogos] = useState({ tipos: [], sucursales: [], areas: [], asociados: [] });
    const [modalMov, setModalMov] = useState(false);
    const [modalQR, setModalQR] = useState(false);

    const cargar = useCallback(() => {
        obtenerActivo(id)
            .then(({ data }) => setActivo(data.data))
            .catch((e) => {
                alertaError(mensajeError(e));
                router.replace("/activos");
            });
    }, [id, router]);

    useEffect(() => {
        cargar();
        obtenerTodosLosCatalogos(true).then(setCatalogos).catch(() => {});
    }, [cargar]);

    if (!activo) return <Cargando />;

    const eliminar = async () => {
        const ok = await confirmar({ titulo: `Eliminar ${activo.codigo}`, texto: "Solo para activos registrados por error. Si el activo existió, regístrale una Baja.", confirmar: "Eliminar", peligro: true });
        if (!ok) return;
        try {
            await eliminarActivo(id);
            toastExito("Activo eliminado.");
            router.replace("/activos");
        } catch (e) {
            alertaError(mensajeError(e));
        }
    };

    const esBaja = activo.estado === "BAJA";
    const pct = activo.porcentajeDepreciado ?? 0;

    return (
        <>
            <Link href="/activos" className="mb-4 inline-flex items-center gap-2 text-sm text-stone-300 hover:text-white"><FaArrowLeft /> Consolidado de activos</Link>
            <EncabezadoPagina titulo={`${activo.codigo} · ${activo.descripcion}`} descripcion={`${activo.idActivo} · ${activo.tipoNombre}`}>
                <button onClick={() => setModalQR(true)} className={botonVidrio}><FaQrcode /> Etiqueta QR</button>
                {esGestion && !esBaja && (
                    <>
                        <Link href={`/activos/${id}/editar`} className={botonVidrio}><FaEdit /> Editar</Link>
                        <button onClick={() => setModalMov(true)} className={botonCabecera}><FaExchangeAlt /> Registrar movimiento</button>
                    </>
                )}
            </EncabezadoPagina>

            {activo.noLocalizado && (
                <div className="mb-6 flex items-start gap-3 rounded-2xl border border-red-400/30 bg-red-500/15 p-4 text-red-100">
                    <FaExclamationTriangle className="mt-1 flex-none text-red-300" />
                    <p>No fue localizado en el levantamiento <strong>{activo.ultimaAuditoria?.numero}</strong> del {formatoFecha(activo.ultimaAuditoria?.fecha)}. Verifica su paradero o regístrale una baja.</p>
                </div>
            )}
            {esBaja && (
                <div className="mb-6 rounded-2xl border border-white/15 bg-white/5 p-4 text-stone-200">
                    Dado de baja el {formatoFecha(activo.fechaBaja)}. Motivo: {activo.motivoBaja}
                </div>
            )}

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                <Seccion titulo="Datos del activo" className="lg:col-span-2">
                    <div className="flex flex-col gap-6 sm:flex-row">
                        <div className="flex h-40 w-40 flex-none items-center justify-center overflow-hidden rounded-2xl border border-white/15 bg-white/5 text-5xl text-stone-500">
                            {activo.foto ? <img src={activo.foto} alt={`Foto de ${activo.codigo}`} className="h-full w-full object-cover" /> : <FaBox />}
                        </div>
                        <dl className="grid flex-1 grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
                            <Dato etiqueta="Estado"><EstadoBadge estado={activo.estado} /></Dato>
                            <Dato etiqueta="Condición"><CondicionTexto condicion={activo.condicion} /></Dato>
                            <Dato etiqueta="Marca">{activo.marca}</Dato>
                            <Dato etiqueta="Modelo">{activo.modelo}</Dato>
                            <Dato etiqueta="Serie"><span className="font-mono">{activo.serie}</span></Dato>
                            <Dato etiqueta="Responsable">{activo.responsableNombre}</Dato>
                            <Dato etiqueta="Sucursal / Área">{[activo.sucursalNombre, activo.areaNombre].filter(Boolean).join(" · ")}</Dato>
                            <Dato etiqueta="Líder de área">{activo.liderNombre}</Dato>
                            <Dato etiqueta="Ubicación">{activo.ubicacion}</Dato>
                            {activo.estado === "PRESTADO" && <Dato etiqueta="Devolución esperada">{formatoFecha(activo.prestamo?.fechaDevolucion)}</Dato>}
                            <Dato etiqueta="Observaciones" largo className="sm:col-span-2">{activo.observaciones}</Dato>
                        </dl>
                    </div>
                </Seccion>

                <div className="space-y-6">
                    <Seccion titulo="Depreciación">
                        <dl className="space-y-3">
                            <Dato etiqueta="Valor de compra">{activo.valorCompra != null ? `${formatoMonto(activo.valorCompra)} · ${formatoFecha(activo.fechaCompra)}` : ""}</Dato>
                            <Dato etiqueta="Vida útil">{activo.vidaUtilAnios ? `${activo.vidaUtilAnios} años` : ""}</Dato>
                            <Dato etiqueta="Depreciación mensual">{activo.depreciacionMensual != null ? formatoMonto(activo.depreciacionMensual) : ""}</Dato>
                            <Dato etiqueta="Depreciación acumulada">{activo.depreciacionAcumulada != null ? `${formatoMonto(activo.depreciacionAcumulada)} (${activo.mesesUso} meses)` : ""}</Dato>
                            <Dato etiqueta="Valor en libros"><span className="text-2xl font-bold">{activo.valorLibros != null ? formatoMonto(activo.valorLibros) : "—"}</span></Dato>
                        </dl>
                        {activo.depreciacionMensual != null && (
                            <div className="mt-4">
                                <div className="h-2.5 overflow-hidden rounded-full bg-white/10" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Porcentaje depreciado">
                                    <div className="h-full rounded-full bg-gradient-to-r from-amber-400 to-brand-600" style={{ width: `${pct}%` }} />
                                </div>
                                <p className="mt-1 text-xs text-stone-400">{pct}% depreciado</p>
                            </div>
                        )}
                    </Seccion>

                    <Seccion titulo="Última auditoría">
                        {activo.ultimaAuditoria ? (
                            <dl className="space-y-3">
                                <Dato etiqueta="Levantamiento"><Link href={`/levantamientos/${activo.ultimaAuditoria.levantamientoId}`} className="text-brand-300 hover:underline">{activo.ultimaAuditoria.numero}</Link> · {formatoFecha(activo.ultimaAuditoria.fecha)}</Dato>
                                <Dato etiqueta="Auditado por">{activo.ultimaAuditoria.auditorNombre}</Dato>
                                <Dato etiqueta="Resultado">{activo.ultimaAuditoria.encontrado ? <>Encontrado · {INFO_CONDICION[activo.ultimaAuditoria.condicion]?.etiqueta}</> : <span className="text-red-300">No localizado</span>}</Dato>
                            </dl>
                        ) : <p className="text-stone-400">Aún no se ha incluido en un levantamiento cerrado.</p>}
                    </Seccion>
                </div>
            </div>

            <Seccion titulo="Historial de movimientos" className="mt-6">
                <div className="-mx-5 -mb-5 sm:-mx-8 sm:-mb-8">
                    <TablaMovimientos movimientos={activo.movimientos} mostrarActivo={false} />
                </div>
            </Seccion>

            {activo.levantamientos.length > 0 && (
                <Seccion titulo="Levantamientos" className="mt-6">
                    <ul className="divide-y">
                        {activo.levantamientos.map((l) => (
                            <li key={l.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                                <Link href={`/levantamientos/${l.id}`} className="font-semibold text-brand-300 hover:underline">{l.numero}</Link>
                                <span className="text-stone-300">{formatoFecha(l.fecha)} · {l.auditorNombre}</span>
                                <span className={l.encontrado === false ? "text-red-300" : "text-stone-200"}>
                                    {l.estado === "EN_PROCESO" ? "En proceso" : l.encontrado === false ? "No localizado" : `Encontrado · ${INFO_CONDICION[l.condicion]?.etiqueta || ""}`}
                                </span>
                            </li>
                        ))}
                    </ul>
                </Seccion>
            )}

            <p className="mt-6 text-xs text-stone-500">
                Registrado por {activo.creadoPorNombre} el {formatoFechaHora(activo.fechaCreacion)}.
                {userRole === ROLES.ADMIN && activo.movimientos.every((m) => m.tipo === "ALTA") && activo.levantamientos.length === 0 && (
                    <button onClick={eliminar} className="ml-3 inline-flex items-center gap-1 text-red-400 hover:underline"><FaTrash /> Eliminar (registro por error)</button>
                )}
            </p>

            <MovimientoModal abierto={modalMov} activo={activo} catalogos={catalogos} onCerrar={() => setModalMov(false)} onListo={() => { setModalMov(false); cargar(); }} />
            <EtiquetaQR abierto={modalQR} activo={activo} onCerrar={() => setModalQR(false)} />
        </>
    );
}
