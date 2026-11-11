"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FaSignOutAlt } from "react-icons/fa";
import { useAuth } from "../../context/AuthContext";
import { menuParaRol } from "./menu";
import LogoAssetPro from "../auth/LogoAssetPro";

const estaActivo = (pathname, href) => {
    if (href === "/activos") return pathname === "/activos" || (/^\/activos\/[^/]+/.test(pathname) && pathname !== "/activos/nuevo");
    if (href === "/levantamientos") return pathname.startsWith("/levantamientos");
    return pathname === href;
};

export default function Sidebar({ abierto, onCerrar }) {
    const pathname = usePathname();
    const { logout, userRole } = useAuth();
    const menuVisible = menuParaRol(userRole);

    return (
        <>
            {abierto && <div className="fixed inset-0 z-30 bg-stone-950/60 backdrop-blur-sm lg:hidden" onClick={onCerrar} />}
            <aside
                className={`fixed inset-y-0 left-0 z-40 w-64 flex flex-col border-r border-white/10 bg-stone-950/90 text-white backdrop-blur-xl transition-transform lg:static lg:translate-x-0 lg:bg-stone-950/55 ${
                    abierto ? "translate-x-0" : "-translate-x-full"
                }`}
            >
                <div className="flex items-center gap-3 px-6 py-6 border-b border-white/10">
                    <LogoAssetPro className="h-10 w-10 flex-none" />
                    <div className="leading-tight">
                        <div className="text-xl font-bold tracking-tight">
                            ASSET <span className="text-brand-500">PRO</span>
                        </div>
                        <div className="text-xs font-semibold tracking-wider text-brand-300">FIXED ASSETS</div>
                    </div>
                </div>

                <nav className="mt-4 flex-1 overflow-y-auto px-3 space-y-1">
                    {menuVisible.map((item) => {
                        const activo = estaActivo(pathname, item.href);
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                onClick={onCerrar}
                                className={`flex items-center gap-3 rounded-xl px-4 py-3 transition ${
                                    activo
                                        ? "bg-gradient-to-r from-brand-500/30 to-brand-700/10 font-semibold text-white ring-1 ring-brand-400/40"
                                        : "text-stone-300 hover:bg-white/10 hover:text-white"
                                }`}
                            >
                                <span className={activo ? "text-brand-300" : ""}>{item.icon}</span>
                                {item.name}
                            </Link>
                        );
                    })}
                </nav>

                <button
                    onClick={logout}
                    className="flex items-center gap-3 px-7 py-4 text-stone-300 hover:bg-white/10 hover:text-white transition border-t border-white/10 text-left"
                >
                    <FaSignOutAlt />
                    Cerrar sesión
                </button>
            </aside>
        </>
    );
}
