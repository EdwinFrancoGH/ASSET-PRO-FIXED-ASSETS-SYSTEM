"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { FiChevronLeft, FiChevronRight, FiCopy, FiPlus, FiClock, FiMapPin } from "react-icons/fi";

import EncabezadoPagina from "../../../components/ui/EncabezadoPagina";
import Cargando from "../../../components/ui/Cargando";
import RequireRole from "../../../components/auth/RequireRole";
import VisitaModal from "../../../components/programacion/VisitaModal";
import { tarjeta, botonCabecera, botonVidrio } from "../../../components/ui/tarjeta";
import { claseInput } from "../../../components/ui/estilos";
import { alertaError, toastExito, confirmar } from "../../../components/ui/alertas";
import { useAuth } from "../../../context/AuthContext";
import { obtenerTodosLosCatalogos } from "../../../services/catalogos.service";
import { obtenerAuditores } from "../../../services/users.service";
import { obtenerProgramacion, copiarSemana } from "../../../services/programacion.service";
import { ROLES_GESTION, ROLES_LEVANTAMIENTO } from "../../../utils/roles";
import { hoyISO, mensajeError } from "../../../utils/formato";
import { lunesDe, sumarDias, diasDeSemana, nombreDia, diaMes, rangoSemana, horario } from "../../../utils/semana";

const ESTILO_ESTADO = {
    PENDIENTE: "border-l-brand-400 bg-white/5",
    REALIZADA: "border-l-emerald-400 bg-emerald-500/10",
    CANCELADA: "border-l-stone-500 bg-white/5 opacity-60 line-through"
};

function Programacion() {
    const { userData } = useAuth();
    const esGestion = ROLES_GESTION.includes(userData.role);
    const hoy = hoyISO();

    const [lunes, setLunes] = useState(lunesDe(hoy));
    const [quien, setQuien] = useState(userData.uid); // uid o "todos"
    const [visitas, setVisitas] = useState(null);
    const [catalogos, setCatalogos] = useState(null);
    const [usuarios, setUsuarios] = useState([]);
    const [edicion, setEdicion] = useState(null);

    useEffect(() => {
        Promise.all([obtenerTodosLosCatalogos(true), obtenerAuditores()])
            .then(([c, u]) => { setCatalogos(c); setUsuarios(u.data.data); })
            .catch((e) => alertaError(mensajeError(e, "No se pudieron cargar los catálogos.")));
    }, []);

    const cargar = useCallback(async () => {
        setVisitas(null);
        try {
            const filtros = { desde: lunes, hasta: sumarDias(lunes, 6) };
            if (esGestion) Object.assign(filtros, quien === "todos" ? { todos: "true" } : { usuarioId: quien });
            const { data } = await obtenerProgramacion(filtros);
            setVisitas(data.data);
        } catch (e) {
            alertaError(mensajeError(e, "No se pudo cargar la programación."));
            setVisitas([]);
        }
    }, [lunes, quien, esGestion]);

    useEffect(() => { cargar(); }, [cargar]);

    const dias = useMemo(() => diasDeSemana(lunes), [lunes]);
    const porDia = useMemo(() => Object.fromEntries(dias.map((f) => [f, (visitas || []).filter((v) => v.fecha === f)])), [dias, visitas]);
    const usuarioDestino = quien === "todos" ? userData.uid : quien;

    const nueva = (fecha) => setEdicion({ fecha: fecha || (dias.includes(hoy) ? hoy : lunes), usuarioId: usuarioDestino });

    const copiarAnterior = async () => {
        if (quien === "todos") return alertaError("Elige un usuario para copiar su semana.");
        const origen = sumarDias(lunes, -7);
        if (!(await confirmar({ titulo: "Copiar semana anterior", texto: `Se copiarán las visitas de la semana del ${rangoSemana(origen)} a esta semana (mismos días y horarios).`, confirmar: "Copiar" }))) return;
        try {
            const { data } = await copiarSemana({ desde: origen, hacia: lunes, usuarioId: usuarioDestino });
            toastExito(data.message);
            cargar();
        } catch (e) {
            alertaError(mensajeError(e));
        }
    };

    const total = visitas?.filter((v) => v.estado !== "CANCELADA").length ?? 0;
    const hechas = visitas?.filter((v) => v.estado === "REALIZADA").length ?? 0;

    return (
        <>
            <EncabezadoPagina titulo="Programación" descripcion="Planifica qué día estarás en cada sucursal o área. Tu visita del día aparece en el panel principal.">
                <button onClick={copiarAnterior} className={botonVidrio}><FiCopy /> Copiar semana anterior</button>
                <button onClick={() => nueva()} className={botonCabecera}><FiPlus /> Programar visita</button>
            </EncabezadoPagina>

            <div className={`${tarjeta} mb-6 flex flex-col gap-4 p-4 sm:p-5 md:flex-row md:items-center md:justify-between`}>
                <div className="flex items-center gap-2">
                    <button onClick={() => setLunes(sumarDias(lunes, -7))} aria-label="Semana anterior" className="rounded-xl bg-white/10 p-3 hover:bg-white/20"><FiChevronLeft /></button>
                    <button onClick={() => setLunes(lunesDe(hoy))} className="rounded-xl bg-white/10 px-4 py-2.5 text-sm font-semibold hover:bg-white/20">Esta semana</button>
                    <button onClick={() => setLunes(sumarDias(lunes, 7))} aria-label="Semana siguiente" className="rounded-xl bg-white/10 p-3 hover:bg-white/20"><FiChevronRight /></button>
                    <div className="ml-2">
                        <p className="font-semibold text-white">{rangoSemana(lunes)}</p>
                        {visitas && <p className="text-xs text-stone-400">{total} visita(s) · {hechas} realizada(s)</p>}
                    </div>
                </div>
                {esGestion && (
                    <label className="flex items-center gap-3 text-sm text-stone-300">
                        <span className="whitespace-nowrap">Programación de</span>
                        <select value={quien} onChange={(e) => setQuien(e.target.value)} className={`${claseInput.replace("mt-2 ", "")} md:w-64`}>
                            <option value={userData.uid}>Mi programación</option>
                            {usuarios.filter((u) => u.uid !== userData.uid).map((u) => <option key={u.uid} value={u.uid}>{u.name} ({u.role})</option>)}
                            <option value="todos">Todo el equipo</option>
                        </select>
                    </label>
                )}
            </div>

            {!visitas || !catalogos ? <Cargando /> : (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
                    {dias.map((f) => {
                        const esHoy = f === hoy;
                        return (
                            <section key={f} className={`${tarjeta} flex min-h-40 flex-col p-3 ${esHoy ? "ring-2 ring-brand-400/70" : ""}`}>
                                <header className="mb-2 flex items-baseline justify-between px-1">
                                    <span className={`text-sm font-bold capitalize ${esHoy ? "text-brand-300" : "text-white"}`}>{nombreDia(f)}</span>
                                    <span className="text-xs text-stone-400">{esHoy ? "Hoy" : diaMes(f)}</span>
                                </header>
                                <div className="flex-1 space-y-2">
                                    {porDia[f].map((v) => (
                                        <button key={v.id} onClick={() => setEdicion(v)} className={`w-full rounded-xl border-l-4 p-2.5 text-left text-sm transition hover:bg-white/10 ${ESTILO_ESTADO[v.estado] || ESTILO_ESTADO.PENDIENTE}`}>
                                            <p className="flex items-center gap-1.5 font-semibold text-white"><FiMapPin className="flex-none text-brand-300" /><span className="truncate">{v.sucursalNombre || v.areaNombre}</span></p>
                                            {v.sucursalNombre && v.areaNombre && <p className="truncate text-xs text-stone-300">{v.areaNombre}</p>}
                                            <p className="mt-1 flex items-center gap-1 text-xs text-stone-400"><FiClock /> {horario(v)}</p>
                                            {quien === "todos" && <p className="mt-1 truncate text-xs text-sky-300">{v.usuarioNombre}</p>}
                                            {v.estado === "REALIZADA" && <p className="mt-1 text-xs font-semibold text-emerald-300">Realizada</p>}
                                        </button>
                                    ))}
                                </div>
                                <button onClick={() => nueva(f)} className="mt-2 flex items-center justify-center gap-1 rounded-xl py-2 text-xs font-semibold text-stone-400 hover:bg-white/10 hover:text-white">
                                    <FiPlus /> Agregar
                                </button>
                            </section>
                        );
                    })}
                </div>
            )}

            {catalogos && (
                <VisitaModal
                    visita={edicion}
                    catalogos={catalogos}
                    usuarios={usuarios}
                    esGestion={esGestion}
                    usuarioPorDefecto={usuarioDestino}
                    onCerrar={() => setEdicion(null)}
                    onGuardado={() => { setEdicion(null); cargar(); }}
                />
            )}
        </>
    );
}

export default function ProgramacionPage() {
    return (
        <RequireRole roles={ROLES_LEVANTAMIENTO}>
            <Programacion />
        </RequireRole>
    );
}
