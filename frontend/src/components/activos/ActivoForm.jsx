"use client";

import { useEffect, useRef, useState } from "react";
import { FaCamera, FaBox } from "react-icons/fa";
import Seccion from "../ui/Seccion";
import Campo from "../ui/Campo";
import Cargando from "../ui/Cargando";
import { claseInput, botonPrimario, botonSecundario } from "../ui/estilos";
import { alertaError } from "../ui/alertas";
import { obtenerTodosLosCatalogos } from "../../services/catalogos.service";
import { LISTA_CONDICIONES, INFO_CONDICION } from "../../utils/activos";
import { calcularDepreciacion } from "../../utils/depreciacion";
import { resizeImageToBase64 } from "../../utils/image";
import { formatoMonto, hoyISO, mensajeError } from "../../utils/formato";

const VACIO = {
    tipoId: "", descripcion: "", marca: "", modelo: "", serie: "", condicion: "BUENO",
    sucursalId: "", areaId: "", ubicacion: "", responsableId: "",
    fechaCompra: "", valorCompra: "", vidaUtilAnios: "", observaciones: "", foto: null
};

// Alta y edición de activos (columnas de la hoja MAIN). En edición no se
// cambian tipo, responsable ni ubicación: eso se hace con un movimiento.
export default function ActivoForm({ inicial, onGuardar, onCancelar, textoBoton = "Guardar activo" }) {
    const esEdicion = Boolean(inicial?.id);
    const [datos, setDatos] = useState({ ...VACIO, ...(inicial || {}) });
    const [catalogos, setCatalogos] = useState(null);
    const [guardando, setGuardando] = useState(false);
    const inputFoto = useRef(null);

    useEffect(() => {
        obtenerTodosLosCatalogos(true).then(setCatalogos).catch((e) => {
            setCatalogos({ tipos: [], sucursales: [], areas: [], asociados: [] });
            alertaError(mensajeError(e, "No se pudieron cargar los catálogos."));
        });
    }, []);

    if (!catalogos) return <Cargando />;

    const set = (campo) => (e) => setDatos((d) => ({ ...d, [campo]: e.target.value }));
    const cambiarTipo = (e) => {
        const tipo = catalogos.tipos.find((t) => t.id === e.target.value);
        setDatos((d) => ({ ...d, tipoId: e.target.value, vidaUtilAnios: d.vidaUtilAnios || tipo?.vidaUtilAnios || "" }));
    };

    const cambiarFoto = async (e) => {
        const archivo = e.target.files?.[0];
        e.target.value = "";
        if (!archivo) return;
        try {
            const foto = await resizeImageToBase64(archivo, { maxSize: 900, quality: 0.8 });
            setDatos((d) => ({ ...d, foto }));
        } catch (err) {
            alertaError(err.message);
        }
    };

    const dep = calcularDepreciacion(datos);
    const tipoSel = catalogos.tipos.find((t) => t.id === datos.tipoId);
    const asociados = [...catalogos.asociados].sort((a, b) => (b.areaId === datos.areaId) - (a.areaId === datos.areaId) || a.nombre.localeCompare(b.nombre));

    const enviar = async (e) => {
        e.preventDefault();
        setGuardando(true);
        try {
            await onGuardar(datos);
        } finally {
            setGuardando(false);
        }
    };

    return (
        <form onSubmit={enviar} className="space-y-6">
            <Seccion titulo="Identificación">
                <div className="grid grid-cols-1 gap-5 md:grid-cols-[1fr_auto]">
                    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                        <Campo etiqueta="Equipo (tipo de activo)" htmlFor="tipo" requerido
                            ayuda={esEdicion ? `Código ${inicial.codigo}: el tipo no se cambia.` : tipoSel ? `El código será ${tipoSel.prefijo}-#### (correlativo por tipo).` : "Define el prefijo del código (LAP, IMP…)."}>
                            <select id="tipo" required disabled={esEdicion} value={datos.tipoId} onChange={cambiarTipo} className={claseInput}>
                                <option value="">Selecciona…</option>
                                {catalogos.tipos.map((t) => <option key={t.id} value={t.id}>{t.nombre}</option>)}
                            </select>
                        </Campo>
                        <Campo etiqueta="Condición" htmlFor="cond" requerido>
                            <select id="cond" value={datos.condicion} onChange={set("condicion")} className={claseInput}>
                                {LISTA_CONDICIONES.map((c) => <option key={c} value={c}>{INFO_CONDICION[c].etiqueta}</option>)}
                            </select>
                        </Campo>
                        <Campo etiqueta="Descripción" htmlFor="desc" requerido className="sm:col-span-2">
                            <input id="desc" required minLength={3} value={datos.descripcion} onChange={set("descripcion")} placeholder="Ej. Laptop Dell Latitude 5420" className={claseInput} />
                        </Campo>
                        <Campo etiqueta="Marca" htmlFor="marca">
                            <input id="marca" value={datos.marca} onChange={set("marca")} className={claseInput} />
                        </Campo>
                        <Campo etiqueta="Modelo" htmlFor="modelo">
                            <input id="modelo" value={datos.modelo} onChange={set("modelo")} className={claseInput} />
                        </Campo>
                        <Campo etiqueta="Serie" htmlFor="serie" ayuda="No puede repetirse entre activos." className="sm:col-span-2">
                            <input id="serie" value={datos.serie} onChange={set("serie")} className={`${claseInput} font-mono uppercase`} />
                        </Campo>
                    </div>

                    {/* Foto del activo (columna FotoActivo) */}
                    <div className="flex flex-col items-center gap-3">
                        <div className="flex h-44 w-44 items-center justify-center overflow-hidden rounded-2xl border border-white/15 bg-white/5 text-5xl text-stone-500">
                            {datos.foto ? <img src={datos.foto} alt="Foto del activo" className="h-full w-full object-cover" /> : <FaBox />}
                        </div>
                        <input ref={inputFoto} type="file" accept="image/jpeg,image/png,image/webp" onChange={cambiarFoto} className="sr-only" aria-label="Foto del activo" />
                        <div className="flex gap-2">
                            <button type="button" onClick={() => inputFoto.current?.click()} className="inline-flex items-center gap-2 rounded-lg bg-white/10 px-3 py-2 text-sm font-medium text-stone-100 hover:bg-white/20">
                                <FaCamera /> {datos.foto ? "Cambiar" : "Agregar foto"}
                            </button>
                            {datos.foto && <button type="button" onClick={() => setDatos((d) => ({ ...d, foto: null }))} className="rounded-lg px-3 py-2 text-sm text-red-300 hover:bg-red-500/10">Quitar</button>}
                        </div>
                    </div>
                </div>
            </Seccion>

            {!esEdicion && (
                <Seccion titulo="Ubicación y responsable inicial">
                    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
                        <Campo etiqueta="Sucursal" htmlFor="suc">
                            <select id="suc" value={datos.sucursalId} onChange={set("sucursalId")} className={claseInput}>
                                <option value="">Sin sucursal</option>
                                {catalogos.sucursales.map((s) => <option key={s.id} value={s.id}>{s.nombre}</option>)}
                            </select>
                        </Campo>
                        <Campo etiqueta="Área" htmlFor="area">
                            <select id="area" value={datos.areaId} onChange={set("areaId")} className={claseInput}>
                                <option value="">Sin área</option>
                                {catalogos.areas.map((a) => <option key={a.id} value={a.id}>{a.nombre}</option>)}
                            </select>
                        </Campo>
                        <Campo etiqueta="Ubicación" htmlFor="ubi" ayuda="Ej. Oficina Gerencia, Piso 2">
                            <input id="ubi" value={datos.ubicacion} onChange={set("ubicacion")} className={claseInput} />
                        </Campo>
                        <Campo etiqueta="Responsable (asociado)" htmlFor="resp" ayuda={datos.responsableId ? "Quedará Asignado." : "Sin responsable quedará Disponible."}>
                            <select id="resp" value={datos.responsableId} onChange={set("responsableId")} className={claseInput}>
                                <option value="">Sin responsable</option>
                                {asociados.map((a) => <option key={a.id} value={a.id}>{a.nombre}{a.areaNombre ? ` — ${a.areaNombre}` : ""}</option>)}
                            </select>
                        </Campo>
                    </div>
                </Seccion>
            )}

            <Seccion titulo="Compra y depreciación">
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
                    <Campo etiqueta="Fecha de compra" htmlFor="fc">
                        <input id="fc" type="date" max={hoyISO()} value={datos.fechaCompra || ""} onChange={set("fechaCompra")} className={claseInput} />
                    </Campo>
                    <Campo etiqueta="Valor de compra (USD)" htmlFor="vc">
                        <input id="vc" type="number" min="0" step="0.01" value={datos.valorCompra ?? ""} onChange={set("valorCompra")} className={claseInput} />
                    </Campo>
                    <Campo etiqueta="Vida útil (años)" htmlFor="vu" ayuda={tipoSel?.vidaUtilAnios ? `Sugerida para ${tipoSel.nombre}: ${tipoSel.vidaUtilAnios} años.` : null}>
                        <input id="vu" type="number" min="0.5" step="0.5" value={datos.vidaUtilAnios ?? ""} onChange={set("vidaUtilAnios")} className={claseInput} />
                    </Campo>
                </div>
                <div className="mt-5 grid grid-cols-2 gap-3 rounded-2xl bg-white/5 p-4 text-sm sm:grid-cols-4">
                    {[
                        ["Depreciación mensual", dep ? formatoMonto(dep.depreciacionMensual) : "—"],
                        ["Meses de uso", dep ? dep.mesesUso : "—"],
                        ["Depreciación acumulada", dep ? formatoMonto(dep.depreciacionAcumulada) : "—"],
                        ["Valor en libros", dep ? formatoMonto(dep.valorLibros) : "—"]
                    ].map(([e, v]) => (
                        <div key={e}><p className="text-stone-400">{e}</p><p className="mt-1 text-lg font-semibold text-white">{v}</p></div>
                    ))}
                </div>
                <p className="mt-2 text-xs text-stone-400">Línea recta: valor ÷ (vida útil × 12), igual que la columna DepreciacionMensual del Excel.</p>
            </Seccion>

            <Seccion titulo="Observaciones">
                <textarea rows={3} value={datos.observaciones} onChange={set("observaciones")} className={claseInput} placeholder="Ej. Garantía vigente hasta 2027" aria-label="Observaciones" />
            </Seccion>

            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <button type="button" onClick={onCancelar} disabled={guardando} className={botonSecundario}>Cancelar</button>
                <button type="submit" disabled={guardando} className={botonPrimario}>{guardando ? "Guardando..." : textoBoton}</button>
            </div>
        </form>
    );
}
