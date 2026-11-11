"use client";

import { useCallback, useEffect, useState } from "react";
import { FaPlus, FaCrosshairs, FaMapMarkerAlt } from "react-icons/fa";

import EncabezadoPagina from "../../../components/ui/EncabezadoPagina";
import Cargando from "../../../components/ui/Cargando";
import Modal from "../../../components/ui/Modal";
import Campo from "../../../components/ui/Campo";
import RequireRole from "../../../components/auth/RequireRole";
import { claseInput, botonPrimario, botonSecundario } from "../../../components/ui/estilos";
import { tablaCaja, botonCabecera } from "../../../components/ui/tarjeta";
import { alertaError, toastExito, confirmar } from "../../../components/ui/alertas";

import { obtenerCatalogo, crearEnCatalogo, actualizarEnCatalogo, eliminarDeCatalogo } from "../../../services/catalogos.service";
import { ROLES_GESTION } from "../../../utils/roles";
import { mensajeError } from "../../../utils/formato";
import { obtenerMiUbicacion, urlMapaEmbebido, tieneUbicacion } from "../../../utils/mapas";

// Hoja BD del Excel: NOMBRE_PERIFERICO, SUCURSALES, ASOCIADO/AREA y líderes.
const CATALOGOS = {
    "tipos-activo": {
        titulo: "Tipos de activo",
        singular: "tipo de activo",
        ayuda: "El prefijo forma el código del activo (LAP-0001). La vida útil se propone al registrar.",
        vacio: { nombre: "", prefijo: "", vidaUtilAnios: "", activo: true },
        columnas: [["Equipo", (r) => r.nombre], ["Prefijo", (r) => r.prefijo], ["Vida útil", (r) => (r.vidaUtilAnios ? `${r.vidaUtilAnios} años` : "—")]]
    },
    sucursales: {
        titulo: "Sucursales",
        singular: "sucursal",
        ayuda: "Ubicaciones físicas donde están los activos. Con su ubicación aparecen en el mapa y en “Sucursal más cercana”.",
        vacio: { nombre: "", ciudad: "", direccion: "", lat: "", lng: "", activo: true },
        columnas: [
            ["Sucursal", (r) => r.nombre],
            ["Ciudad", (r) => r.ciudad || "—"],
            ["Ubicación", (r) => (tieneUbicacion(r) ? <span className="inline-flex items-center gap-1 text-emerald-300"><FaMapMarkerAlt /> En mapa</span> : <span className="text-amber-300">Sin ubicación</span>)]
        ]
    },
    areas: {
        titulo: "Áreas",
        singular: "área",
        ayuda: "El líder de área firma el acta de validación del levantamiento.",
        vacio: { nombre: "", liderId: "", activo: true },
        columnas: [["Área", (r) => r.nombre], ["Líder de área", (r) => r.liderNombre || "—"]]
    },
    asociados: {
        titulo: "Asociados",
        singular: "asociado",
        ayuda: "Personas responsables de activos (no necesitan usuario en el sistema).",
        vacio: { nombre: "", cargo: "", correo: "", areaId: "", sucursalId: "", activo: true },
        columnas: [["Nombre", (r) => r.nombre], ["Cargo", (r) => r.cargo || "—"], ["Área", (r) => r.areaNombre || "—"], ["Sucursal", (r) => r.sucursalNombre || "—"]]
    }
};

function Catalogos() {
    const [pestana, setPestana] = useState("tipos-activo");
    const [datos, setDatos] = useState({});
    const [edicion, setEdicion] = useState(null);
    const [guardando, setGuardando] = useState(false);
    const cfg = CATALOGOS[pestana];

    const cargar = useCallback(async () => {
        try {
            const r = await Promise.all(Object.keys(CATALOGOS).map((c) => obtenerCatalogo(c)));
            setDatos(Object.fromEntries(Object.keys(CATALOGOS).map((c, i) => [c, r[i].data.data])));
        } catch (e) {
            alertaError(mensajeError(e));
            setDatos({ "tipos-activo": [], sucursales: [], areas: [], asociados: [] });
        }
    }, []);

    useEffect(() => { cargar(); }, [cargar]);

    const set = (c) => (e) => setEdicion((d) => ({ ...d, [c]: e.target.type === "checkbox" ? e.target.checked : e.target.value }));

    const guardar = async (e) => {
        e.preventDefault();
        setGuardando(true);
        try {
            const { id, ...cuerpo } = edicion;
            const { data } = id ? await actualizarEnCatalogo(pestana, id, cuerpo) : await crearEnCatalogo(pestana, cuerpo);
            toastExito(data.message);
            setEdicion(null);
            cargar();
        } catch (err) {
            alertaError(mensajeError(err));
        } finally {
            setGuardando(false);
        }
    };

    const eliminar = async (r) => {
        if (!(await confirmar({ titulo: `Eliminar ${cfg.singular}`, texto: `Se eliminará "${r.nombre}". Si hay activos que lo usan, desactívalo en su lugar.`, confirmar: "Eliminar", peligro: true }))) return;
        try {
            const { data } = await eliminarDeCatalogo(pestana, r.id);
            toastExito(data.message);
            cargar();
        } catch (err) {
            alertaError(mensajeError(err));
        }
    };

    // Estando físicamente en la sucursal: toma las coordenadas del GPS del dispositivo.
    const usarMiUbicacion = async () => {
        try {
            const u = await obtenerMiUbicacion();
            setEdicion((d) => ({ ...d, lat: u.lat.toFixed(6), lng: u.lng.toFixed(6) }));
            if (u.precision > 100) toastExito(`Ubicación tomada (precisión ±${Math.round(u.precision)} m)`);
        } catch (e) {
            alertaError(e.message);
        }
    };

    const lista = datos[pestana];

    return (
        <>
            <EncabezadoPagina titulo="Catálogos" descripcion="Datos de referencia del inventario (hoja BD del Excel).">
                <button onClick={() => setEdicion({ ...cfg.vacio })} className={botonCabecera}><FaPlus /> Nuevo {cfg.singular}</button>
            </EncabezadoPagina>

            <div className={tablaCaja}>
                <div className="flex gap-1 overflow-x-auto border-b px-4 pt-4" role="tablist">
                    {Object.entries(CATALOGOS).map(([k, v]) => (
                        <button key={k} role="tab" aria-selected={pestana === k} onClick={() => setPestana(k)}
                            className={`whitespace-nowrap rounded-t-xl px-5 py-3 font-medium transition ${pestana === k ? "bg-brand-500/20 text-white ring-1 ring-brand-400/40" : "text-stone-300 hover:bg-white/5"}`}>
                            {v.titulo} {datos[k] && <span className="ml-1 text-xs text-stone-400">({datos[k].length})</span>}
                        </button>
                    ))}
                </div>
                <p className="px-6 pt-4 text-sm text-stone-400">{cfg.ayuda}</p>
                {!lista ? <Cargando /> : lista.length === 0 ? <p className="p-10 text-center text-stone-300">Aún no hay registros.</p> : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="text-left text-stone-300">
                                <tr>
                                    {cfg.columnas.map(([t]) => <th key={t} className="px-6 py-4 font-semibold">{t}</th>)}
                                    <th className="px-6 py-4 font-semibold">Estado</th>
                                    <th className="px-6 py-4"><span className="sr-only">Acciones</span></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/10">
                                {lista.map((r) => (
                                    <tr key={r.id} className="hover:bg-white/5">
                                        {cfg.columnas.map(([t, f], i) => <td key={t} className={`px-6 py-3 ${i === 0 ? "font-medium text-white" : "text-stone-300"}`}>{f(r)}</td>)}
                                        <td className="px-6 py-3">
                                            <span className={`rounded-full px-3 py-1 text-xs font-semibold ${r.activo !== false ? "bg-emerald-500/15 text-emerald-300" : "bg-white/10 text-stone-400"}`}>{r.activo !== false ? "Activo" : "Inactivo"}</span>
                                        </td>
                                        <td className="px-6 py-3 text-right whitespace-nowrap">
                                            <button onClick={() => setEdicion({ ...cfg.vacio, ...r, liderId: r.liderId || "", areaId: r.areaId || "", sucursalId: r.sucursalId || "", vidaUtilAnios: r.vidaUtilAnios ?? "", direccion: r.direccion || "", lat: r.lat ?? "", lng: r.lng ?? "" })} className="rounded-lg px-3 py-1.5 font-medium text-brand-300 hover:bg-brand-500/10">Editar</button>
                                            <button onClick={() => eliminar(r)} className="rounded-lg px-3 py-1.5 font-medium text-red-400 hover:bg-red-500/15">Eliminar</button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            <Modal abierto={Boolean(edicion)} titulo={`${edicion?.id ? "Editar" : "Nuevo"} ${cfg.singular}`} onCerrar={() => !guardando && setEdicion(null)}>
                {edicion && (
                    <form onSubmit={guardar} className="space-y-4">
                        <Campo etiqueta="Nombre" htmlFor="c-nombre" requerido>
                            <input id="c-nombre" required minLength={2} autoFocus value={edicion.nombre} onChange={set("nombre")} className={claseInput} />
                        </Campo>
                        {pestana === "tipos-activo" && (
                            <div className="grid grid-cols-2 gap-4">
                                <Campo etiqueta="Prefijo del código" htmlFor="c-pref" ayuda="Vacío = 3 primeras letras.">
                                    <input id="c-pref" maxLength={5} value={edicion.prefijo} onChange={set("prefijo")} className={`${claseInput} uppercase`} />
                                </Campo>
                                <Campo etiqueta="Vida útil (años)" htmlFor="c-vida">
                                    <input id="c-vida" type="number" min="0.5" step="0.5" value={edicion.vidaUtilAnios} onChange={set("vidaUtilAnios")} className={claseInput} />
                                </Campo>
                            </div>
                        )}
                        {pestana === "sucursales" && (
                            <>
                                <Campo etiqueta="Ciudad" htmlFor="c-ciudad"><input id="c-ciudad" value={edicion.ciudad} onChange={set("ciudad")} className={claseInput} /></Campo>
                                <Campo etiqueta="Dirección" htmlFor="c-dir" ayuda="Si dejas latitud y longitud vacías, se ubica automáticamente con Google Maps al guardar.">
                                    <input id="c-dir" value={edicion.direccion} onChange={set("direccion")} placeholder="Ej. Blvd. Los Héroes, San Salvador" className={claseInput} />
                                </Campo>
                                <div className="grid grid-cols-2 gap-4">
                                    <Campo etiqueta="Latitud" htmlFor="c-lat"><input id="c-lat" inputMode="decimal" value={edicion.lat} onChange={set("lat")} placeholder="13.6929" className={claseInput} /></Campo>
                                    <Campo etiqueta="Longitud" htmlFor="c-lng"><input id="c-lng" inputMode="decimal" value={edicion.lng} onChange={set("lng")} placeholder="-89.2182" className={claseInput} /></Campo>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    <button type="button" onClick={usarMiUbicacion} className="inline-flex items-center gap-2 rounded-lg bg-white/10 px-3 py-2 text-sm text-stone-200 hover:bg-white/20">
                                        <FaCrosshairs /> Usar mi ubicación actual
                                    </button>
                                    {(edicion.lat !== "" || edicion.lng !== "") && (
                                        <button type="button" onClick={() => setEdicion((d) => ({ ...d, lat: "", lng: "" }))} className="rounded-lg px-3 py-2 text-sm text-stone-400 hover:bg-white/10">Quitar coordenadas</button>
                                    )}
                                </div>
                                <p className="text-xs text-stone-400">Tip: en Google Maps haz clic derecho sobre la sucursal y copia las coordenadas.</p>
                                {edicion.lat !== "" && edicion.lng !== "" && !isNaN(Number(edicion.lat)) && !isNaN(Number(edicion.lng)) && (
                                    <iframe title="Vista previa de la ubicación" src={urlMapaEmbebido({ lat: edicion.lat, lng: edicion.lng })} loading="lazy" className="h-48 w-full rounded-2xl border-0 ring-1 ring-white/10" />
                                )}
                            </>
                        )}
                        {pestana === "areas" && (
                            <Campo etiqueta="Líder de área" htmlFor="c-lider" ayuda="Créalo antes en la pestaña Asociados.">
                                <select id="c-lider" value={edicion.liderId} onChange={set("liderId")} className={claseInput}>
                                    <option value="">Sin líder</option>
                                    {(datos.asociados || []).filter((a) => a.activo !== false).map((a) => <option key={a.id} value={a.id}>{a.nombre}</option>)}
                                </select>
                            </Campo>
                        )}
                        {pestana === "asociados" && (
                            <>
                                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                    <Campo etiqueta="Cargo" htmlFor="c-cargo"><input id="c-cargo" value={edicion.cargo} onChange={set("cargo")} className={claseInput} /></Campo>
                                    <Campo etiqueta="Correo" htmlFor="c-correo"><input id="c-correo" type="email" value={edicion.correo} onChange={set("correo")} className={claseInput} /></Campo>
                                    <Campo etiqueta="Área" htmlFor="c-area">
                                        <select id="c-area" value={edicion.areaId} onChange={set("areaId")} className={claseInput}>
                                            <option value="">Sin área</option>
                                            {(datos.areas || []).map((a) => <option key={a.id} value={a.id}>{a.nombre}</option>)}
                                        </select>
                                    </Campo>
                                    <Campo etiqueta="Sucursal" htmlFor="c-suc">
                                        <select id="c-suc" value={edicion.sucursalId} onChange={set("sucursalId")} className={claseInput}>
                                            <option value="">Sin sucursal</option>
                                            {(datos.sucursales || []).map((s) => <option key={s.id} value={s.id}>{s.nombre}</option>)}
                                        </select>
                                    </Campo>
                                </div>
                            </>
                        )}
                        {edicion.id && (
                            <label className="flex items-center gap-3 text-stone-200">
                                <input type="checkbox" checked={edicion.activo !== false} onChange={set("activo")} className="h-4 w-4" /> Activo (aparece en los formularios)
                            </label>
                        )}
                        <div className="flex justify-end gap-3 pt-2">
                            <button type="button" onClick={() => setEdicion(null)} disabled={guardando} className={botonSecundario}>Cancelar</button>
                            <button type="submit" disabled={guardando} className={botonPrimario}>{guardando ? "Guardando..." : "Guardar"}</button>
                        </div>
                    </form>
                )}
            </Modal>
        </>
    );
}

export default function CatalogosPage() {
    return (
        <RequireRole roles={ROLES_GESTION}>
            <Catalogos />
        </RequireRole>
    );
}
