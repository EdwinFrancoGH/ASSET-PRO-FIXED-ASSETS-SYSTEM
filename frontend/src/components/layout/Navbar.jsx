"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FaBars, FaUserCircle, FaHome, FaBoxes, FaPlusCircle, FaEdit, FaBox, FaExchangeAlt, FaClipboardCheck, FaClipboardList, FaBell, FaListUl, FaUserShield, FaUser } from "react-icons/fa";
import { useAuth } from "../../context/AuthContext";
import NotificacionesBell from "./NotificacionesBell";
import InterruptorTema from "./InterruptorTema";

// Título de la barra según la sección. Las rutas más específicas van primero.
const SECCIONES = [
    { patron: /^\/dashboard$/, titulo: "Panel principal", subtitulo: "Resumen del inventario de activos fijos", icono: FaHome },
    { patron: /^\/activos\/nuevo$/, titulo: "Nuevo activo", subtitulo: "Registra un activo fijo en el consolidado", icono: FaPlusCircle },
    { patron: /^\/activos\/[^/]+\/editar$/, titulo: "Editar activo", subtitulo: "Corrige los datos descriptivos y financieros", icono: FaEdit },
    { patron: /^\/activos\/[^/]+$/, titulo: "Ficha del activo", subtitulo: "Datos, depreciación, movimientos y levantamientos", icono: FaBox },
    { patron: /^\/activos$/, titulo: "Consolidado de activos", subtitulo: "Inventario de activos fijos de la empresa", icono: FaBoxes },
    { patron: /^\/movimientos$/, titulo: "Movimientos", subtitulo: "Asignaciones, traslados, préstamos, mantenimientos y bajas", icono: FaExchangeAlt },
    { patron: /^\/levantamientos\/nuevo$/, titulo: "Nuevo levantamiento", subtitulo: "Auditoría física de activos por sucursal o área", icono: FaClipboardList },
    { patron: /^\/levantamientos\/[^/]+$/, titulo: "Levantamiento", subtitulo: "Verificación física y acta de validación", icono: FaClipboardCheck },
    { patron: /^\/levantamientos$/, titulo: "Levantamientos", subtitulo: "Auditorías físicas y actas de validación", icono: FaClipboardCheck },
    { patron: /^\/notificaciones$/, titulo: "Notificaciones", subtitulo: "Avisos del sistema", icono: FaBell },
    { patron: /^\/catalogos$/, titulo: "Catálogos", subtitulo: "Tipos de activo, sucursales, áreas y asociados", icono: FaListUl },
    { patron: /^\/usuarios$/, titulo: "Usuarios", subtitulo: "Administración de cuentas y roles", icono: FaUserShield },
    { patron: /^\/perfil$/, titulo: "Mi perfil", subtitulo: "Tus datos de usuario", icono: FaUser }
];

const SECCION_POR_DEFECTO = { titulo: "ASSET PRO FIXED ASSETS", subtitulo: "Control de activos fijos", icono: FaHome };

export default function Navbar({ onAbrirMenu }) {
    const { userData } = useAuth();
    const pathname = usePathname();
    const seccion = SECCIONES.find((s) => s.patron.test(pathname)) || SECCION_POR_DEFECTO;
    const Icono = seccion.icono;

    return (
        <header className="relative z-20 mx-4 mt-4 md:mx-8 rounded-2xl border border-white/10 bg-stone-900/45 backdrop-blur-md shadow-xl shadow-black/30 min-h-20 sm:min-h-24 py-3 sm:py-4 flex items-center justify-between gap-2 sm:gap-4 px-3 sm:px-4 md:px-6">
            <div className="flex min-w-0 items-center gap-2 sm:gap-3">
                <button onClick={onAbrirMenu} className="lg:hidden flex-none rounded-lg p-2 text-stone-200 hover:bg-white/10" aria-label="Abrir menú">
                    <FaBars className="text-xl" />
                </button>
                <span className="hidden sm:flex h-14 w-14 flex-none items-center justify-center rounded-2xl text-2xl bg-brand-500/15 text-brand-300">
                    <Icono />
                </span>
                <div className="min-w-0 leading-tight">
                    <h1 className="truncate text-lg font-bold sm:text-2xl md:text-3xl text-white">{seccion.titulo}</h1>
                    <p className="mt-1 hidden sm:block truncate text-base text-stone-300">{seccion.subtitulo}</p>
                </div>
            </div>

            <div className="flex flex-none items-center gap-1 sm:gap-4">
                <InterruptorTema />
                <NotificacionesBell oscuro />
                <Link href="/perfil" className="flex items-center gap-2 rounded-lg px-1 py-1 sm:px-2 transition hover:bg-white/10">
                    {userData?.photoURL ? (
                        <img src={userData.photoURL} alt="Foto de perfil" className="h-8 w-8 rounded-full object-cover sm:h-9 sm:w-9" />
                    ) : (
                        <FaUserCircle className="text-2xl sm:text-3xl text-stone-300" aria-hidden="true" />
                    )}
                    <div className="hidden sm:block text-sm text-left leading-tight">
                        <p className="font-semibold text-white">{userData?.name || userData?.email}</p>
                        <p className="text-xs text-stone-400">{userData?.role}</p>
                    </div>
                </Link>
            </div>
        </header>
    );
}
