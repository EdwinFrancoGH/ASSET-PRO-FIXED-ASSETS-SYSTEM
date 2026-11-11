"use client";

import { useState } from "react";
import Sidebar from "../../components/layout/Sidebar";
import Navbar from "../../components/layout/Navbar";
import ProtectedRoute from "../../components/auth/ProtectedRoute";
import InactividadSesion from "../../components/auth/InactividadSesion";
import FondoNocturno from "../../components/ui/FondoNocturno";

// Mismo layout que ASSET PRO PAY: el fondo del venado (rojo) cubre el menú
// lateral, la barra superior "flotante" y el área de trabajo.
export default function AppLayout({ children }) {
    const [menuAbierto, setMenuAbierto] = useState(false);

    return (
        <ProtectedRoute>
            <InactividadSesion />
            <div className="tema-nocturno app-fondo relative flex min-h-screen text-stone-100">
                <FondoNocturno />
                <Sidebar abierto={menuAbierto} onCerrar={() => setMenuAbierto(false)} />
                <div className="relative flex-1 min-w-0 flex flex-col">
                    <Navbar onAbrirMenu={() => setMenuAbierto(true)} />
                    <main className="relative flex-1 p-4 md:p-8">
                        <div className="relative z-10 max-w-7xl mx-auto">{children}</div>
                    </main>
                </div>
            </div>
        </ProtectedRoute>
    );
}
