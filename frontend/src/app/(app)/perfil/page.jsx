"use client";

import { useRef, useState } from "react";
import { FaCamera, FaUserCircle } from "react-icons/fa";

import EncabezadoPagina from "../../../components/ui/EncabezadoPagina";
import Seccion from "../../../components/ui/Seccion";
import Campo from "../../../components/ui/Campo";
import { claseInput, botonPrimario, botonSecundario } from "../../../components/ui/estilos";
import { alertaError, toastExito } from "../../../components/ui/alertas";
import { useAuth } from "../../../context/AuthContext";
import { actualizarPerfil } from "../../../services/users.service";
import { mensajeError } from "../../../utils/formato";
import { resizeImageToBase64 } from "../../../utils/image";

export default function PerfilPage() {
    const { userData, refreshUserData } = useAuth();
    const [name, setName] = useState(userData.name || "");
    const [password, setPassword] = useState("");
    const [confirmacion, setConfirmacion] = useState("");
    const [guardando, setGuardando] = useState(false);
    const [guardandoFoto, setGuardandoFoto] = useState(false);
    const inputFoto = useRef(null);

    const cambiarFoto = async (e) => {
        const archivo = e.target.files?.[0];
        e.target.value = "";
        if (!archivo) return;

        setGuardandoFoto(true);
        try {
            const photoURL = await resizeImageToBase64(archivo);
            await actualizarPerfil({ photoURL });
            await refreshUserData();
            toastExito("Foto de perfil actualizada.");
        } catch (err) {
            alertaError(mensajeError(err));
        } finally {
            setGuardandoFoto(false);
        }
    };

    const quitarFoto = async () => {
        setGuardandoFoto(true);
        try {
            await actualizarPerfil({ photoURL: null });
            await refreshUserData();
            toastExito("Foto de perfil eliminada.");
        } catch (err) {
            alertaError(mensajeError(err));
        } finally {
            setGuardandoFoto(false);
        }
    };

    const guardar = async (e) => {
        e.preventDefault();
        if (password && password !== confirmacion) return alertaError("Las contraseñas no coinciden.");
        setGuardando(true);
        try {
            await actualizarPerfil({ name: name.trim(), ...(password ? { password } : {}) });
            await refreshUserData();
            setPassword("");
            setConfirmacion("");
            toastExito("Perfil actualizado.");
        } catch (err) {
            alertaError(mensajeError(err));
        } finally {
            setGuardando(false);
        }
    };

    return (
        <>
            <EncabezadoPagina titulo="Mi perfil" descripcion={`${userData.email}, ${userData.role}`} />
            <Seccion titulo="Datos de la cuenta" className="max-w-2xl">
                <form onSubmit={guardar} className="space-y-5">
                    <div className="flex flex-wrap items-center gap-4">
                        <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-full border-2 border-brand-500/40 bg-white/10 text-stone-300">
                            {userData.photoURL ? (
                                <img src={userData.photoURL} alt="Foto de perfil" className="h-full w-full object-cover" />
                            ) : (
                                <FaUserCircle className="text-6xl" aria-hidden="true" />
                            )}
                        </div>
                        <div className="flex flex-wrap gap-2">
                            <input
                                ref={inputFoto}
                                type="file"
                                accept="image/jpeg,image/png,image/webp"
                                onChange={cambiarFoto}
                                className="sr-only"
                                aria-label="Seleccionar foto de perfil"
                            />
                            <button
                                type="button"
                                onClick={() => inputFoto.current?.click()}
                                disabled={guardandoFoto}
                                className={botonPrimario}
                            >
                                <span className="inline-flex items-center gap-2">
                                    <FaCamera aria-hidden="true" />
                                    {guardandoFoto ? "Guardando foto..." : userData.photoURL ? "Cambiar foto" : "Agregar foto"}
                                </span>
                            </button>
                            {userData.photoURL && (
                                <button type="button" onClick={quitarFoto} disabled={guardandoFoto} className={botonSecundario}>
                                    Quitar foto
                                </button>
                            )}
                        </div>
                        <p className="w-full text-sm text-stone-400">JPG, PNG o WEBP. La foto se reduce antes de guardarse.</p>
                    </div>
                    <Campo etiqueta="Nombre completo" htmlFor="name" requerido>
                        <input id="name" required value={name} onChange={(e) => setName(e.target.value)} className={claseInput} />
                    </Campo>
                    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                        <Campo etiqueta="Nueva contraseña" htmlFor="password" ayuda="Déjala vacía para no cambiarla.">
                            <input id="password" type="password" minLength={6} autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} className={claseInput} />
                        </Campo>
                        <Campo etiqueta="Confirmar contraseña" htmlFor="confirmacion">
                            <input id="confirmacion" type="password" autoComplete="new-password" value={confirmacion} onChange={(e) => setConfirmacion(e.target.value)} className={claseInput} />
                        </Campo>
                    </div>
                    <div className="flex justify-end">
                        <button type="submit" disabled={guardando} className={botonPrimario}>{guardando ? "Guardando..." : "Guardar cambios"}</button>
                    </div>
                </form>
            </Seccion>
        </>
    );
}
