"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { FiArrowLeft, FiBox, FiUserCheck, FiTool, FiAlertTriangle, FiClipboard, FiDollarSign } from "react-icons/fi";

import EncabezadoPagina from "../../../components/ui/EncabezadoPagina";
import Cargando from "../../../components/ui/Cargando";
import Barras from "../../../components/dashboard/Barras";
import AgendaHoy from "../../../components/dashboard/AgendaHoy";
import SucursalCercana from "../../../components/dashboard/SucursalCercana";
import MenuMovil from "../../../components/dashboard/MenuMovil";
import TablaMovimientos from "../../../components/activos/TablaMovimientos";
import { tarjeta } from "../../../components/ui/tarjeta";
import { alertaError } from "../../../components/ui/alertas";
import { useAuth } from "../../../context/AuthContext";
import { obtenerResumen } from "../../../services/activos.service";
import { obtenerProgramacionHoy } from "../../../services/programacion.service";
import { BIENVENIDA_ROLES, ROLES_LEVANTAMIENTO, ROLES_GESTION } from "../../../utils/roles";
import { formatoMonto, mensajeError } from "../../../utils/formato";

export default function DashboardPage() {
    const { userData } = useAuth();
    const [r, setR] = useState(null);
    const [hoy, setHoy] = useState(null);
    // Móvil: al entrar se muestran las opciones del menú; el panel se abre con un botón.
    const [verPanel, setVerPanel] = useState(false);
    const programa = ROLES_LEVANTAMIENTO.includes(userData.role);

    useEffect(() => {
        if (!programa) return;
        obtenerProgramacionHoy().then(({ data }) => setHoy(data.data)).catch(() => setHoy(false));
    }, [programa]);

    useEffect(() => {
        obtenerResumen().then(({ data }) => setR(data.data)).catch((e) => {
            setR(false);
            alertaError(mensajeError(e, "No se pudo cargar el resumen."));
        });
    }, []);

    const primerNombre = (userData.name || "").split(" ")[0];

    const tarjetas = r ? [
        { titulo: "Activos vigentes", valor: r.total, color: "text-white", icono: FiBox, fondo: "bg-brand-500/15 text-brand-300", href: "/activos" },
        { titulo: "Asignados", valor: r.porEstado.ASIGNADO + r.porEstado.PRESTADO, color: "text-emerald-400", icono: FiUserCheck, fondo: "bg-emerald-500/15 text-emerald-300", href: "/activos?estado=ASIGNADO,PRESTADO" },
        { titulo: "En reparación", valor: r.porEstado.EN_REPARACION, color: "text-amber-400", icono: FiTool, fondo: "bg-amber-500/15 text-amber-300", href: "/activos?estado=EN_REPARACION" },
        { titulo: "No localizados", valor: r.noLocalizados, color: "text-red-400", icono: FiAlertTriangle, fondo: "bg-red-500/15 text-red-300", href: "/activos?noLocalizado=true" }
    ] : [];

    return (
        <>
            {!verPanel && <MenuMovil nombre={primerNombre} rol={userData.role} hoy={hoy} onVerPanel={() => setVerPanel(true)} />}

            <div className={verPanel ? "" : "hidden md:block"}>
            {verPanel && (
                <button onClick={() => setVerPanel(false)} className="mb-4 inline-flex items-center gap-2 rounded-xl bg-white/10 px-4 py-2 text-sm font-semibold text-stone-200 ring-1 ring-white/15 md:hidden">
                    <FiArrowLeft /> Volver al menú
                </button>
            )}
            <EncabezadoPagina titulo={`Hola, ${primerNombre}`} descripcion={BIENVENIDA_ROLES[userData.role]}>
                {r && (
                    <div className="flex flex-wrap gap-6 rounded-2xl bg-white/5 px-5 py-3 ring-1 ring-white/10">
                        <div><p className="text-xs text-stone-400">Valor de compra</p><p className="text-xl font-bold">{formatoMonto(r.valorCompra)}</p></div>
                        <div><p className="text-xs text-stone-400">Valor en libros</p><p className="text-xl font-bold text-brand-300">{formatoMonto(r.valorLibros)}</p></div>
                        <div><p className="text-xs text-stone-400">Depreciación mensual</p><p className="text-xl font-bold">{formatoMonto(r.depreciacionMensual)}</p></div>
                    </div>
                )}
            </EncabezadoPagina>

            {/* Agenda del día (Programación) y sucursal más cercana (Google Maps) */}
            <div className={`mb-8 grid grid-cols-1 gap-6 ${programa ? "lg:grid-cols-2" : ""}`}>
                {programa && <AgendaHoy hoy={hoy} />}
                <SucursalCercana
                    sucursalesDeHoy={(hoy?.visitas || []).map((v) => v.sucursalId).filter(Boolean)}
                    puedeConfigurar={ROLES_GESTION.includes(userData.role)}
                />
            </div>

            {r === null ? <Cargando /> : r === false ? null : (
                <>
                    <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
                        {tarjetas.map((t) => {
                            const Icono = t.icono;
                            return (
                                <Link key={t.titulo} href={t.href} className={`${tarjeta} flex items-center justify-between gap-3 p-4 sm:p-6 transition hover:border-brand-400/60 hover:bg-stone-800/50`}>
                                    <div>
                                        <p className="text-sm text-stone-300">{t.titulo}</p>
                                        <p className={`mt-1 text-3xl font-bold ${t.color}`}>{t.valor}</p>
                                    </div>
                                    <span className={`hidden sm:flex h-12 w-12 items-center justify-center rounded-2xl text-2xl ${t.fondo}`}><Icono /></span>
                                </Link>
                            );
                        })}
                    </div>

                    <div className="mb-8 grid grid-cols-1 gap-6 lg:grid-cols-3">
                        <section className={`${tarjeta} p-5 sm:p-6`}>
                            <h2 className="mb-4 text-lg font-semibold text-white">Activos por equipo</h2>
                            <Barras datos={r.porTipo} vacio="Aún no hay activos." />
                        </section>
                        <section className={`${tarjeta} p-5 sm:p-6`}>
                            <h2 className="mb-4 text-lg font-semibold text-white">Activos por sucursal</h2>
                            <Barras datos={r.porSucursal} vacio="Aún no hay activos." />
                        </section>
                        <section className={`${tarjeta} space-y-4 p-5 sm:p-6`}>
                            <h2 className="text-lg font-semibold text-white">Control</h2>
                            <Link href="/activos?sinAuditar=true" className="flex items-center justify-between rounded-2xl bg-white/5 p-4 hover:bg-white/10">
                                <span className="flex items-center gap-3 text-stone-200"><FiClipboard className="text-amber-300" /> Sin auditar en {r.diasSinAuditar} días</span>
                                <span className="text-2xl font-bold text-amber-300">{r.sinAuditar}</span>
                            </Link>
                            <Link href="/levantamientos?estado=EN_PROCESO" className="flex items-center justify-between rounded-2xl bg-white/5 p-4 hover:bg-white/10">
                                <span className="flex items-center gap-3 text-stone-200"><FiClipboard className="text-sky-300" /> Levantamientos en proceso</span>
                                <span className="text-2xl font-bold text-sky-300">{r.levantamientosEnProceso}</span>
                            </Link>
                            <Link href="/activos?estado=BAJA" className="flex items-center justify-between rounded-2xl bg-white/5 p-4 hover:bg-white/10">
                                <span className="flex items-center gap-3 text-stone-200"><FiDollarSign className="text-stone-400" /> Dados de baja</span>
                                <span className="text-2xl font-bold text-stone-300">{r.bajas}</span>
                            </Link>
                            <p className="text-xs text-stone-400">Disponibles en bodega: <strong className="text-stone-200">{r.porEstado.DISPONIBLE}</strong></p>
                        </section>
                    </div>

                    <section className={`${tarjeta} overflow-hidden`}>
                        <div className="flex items-center justify-between border-b border-white/10 px-5 pt-5 pb-4 sm:px-8 sm:pt-6">
                            <h2 className="text-xl font-semibold text-white">Últimos movimientos</h2>
                            <Link href="/movimientos" className="text-sm text-brand-300 hover:underline">Ver todos</Link>
                        </div>
                        <TablaMovimientos movimientos={r.ultimosMovimientos} vacio="Todavía no hay movimientos." />
                    </section>
                </>
            )}
            </div>
        </>
    );
}
