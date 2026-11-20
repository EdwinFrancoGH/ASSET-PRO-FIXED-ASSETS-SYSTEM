import { FaHome, FaBoxes, FaPlusCircle, FaExchangeAlt, FaClipboardCheck, FaBell, FaListUl, FaUserShield, FaCalendarAlt } from "react-icons/fa";
import { ROLES, ROLES_GESTION, ROLES_LEVANTAMIENTO, ROLES_CATALOGOS } from "../../utils/roles";

// Opciones del menú: las usan el Sidebar y los botones grandes del inicio en móvil.
// "roles": quién ve el ítem. Sin "roles", lo ve cualquier usuario.
// "descripcion" y "fondo": solo para los botones del inicio en móvil.
export const MENU = [
    { name: "Inicio", href: "/dashboard", icon: <FaHome />, soloSidebar: true },
    { name: "Activos", href: "/activos", icon: <FaBoxes />, descripcion: "Consolidado", fondo: "bg-brand-500/15 text-brand-300" },
    { name: "Nuevo activo", href: "/activos/nuevo", icon: <FaPlusCircle />, roles: ROLES_GESTION, descripcion: "Registrar", fondo: "bg-emerald-500/15 text-emerald-300" },
    { name: "Movimientos", href: "/movimientos", icon: <FaExchangeAlt />, descripcion: "Historial", fondo: "bg-sky-500/15 text-sky-300" },
    { name: "Levantamientos", href: "/levantamientos", icon: <FaClipboardCheck />, descripcion: "Auditorías", fondo: "bg-amber-500/15 text-amber-300" },
    { name: "Programación", href: "/programacion", icon: <FaCalendarAlt />, roles: ROLES_LEVANTAMIENTO, descripcion: "Mi semana", fondo: "bg-violet-500/15 text-violet-300" },
    { name: "Notificaciones", href: "/notificaciones", icon: <FaBell />, descripcion: "Avisos", fondo: "bg-rose-500/15 text-rose-300" },
    { name: "Catálogos", href: "/catalogos", icon: <FaListUl />, roles: ROLES_CATALOGOS, descripcion: "Sucursales, áreas…", fondo: "bg-teal-500/15 text-teal-300" },
    { name: "Usuarios", href: "/usuarios", icon: <FaUserShield />, roles: [ROLES.ADMIN], descripcion: "Accesos y roles", fondo: "bg-stone-500/20 text-stone-200" }
];

export const menuParaRol = (rol) => MENU.filter((item) => !item.roles || item.roles.includes(rol));
