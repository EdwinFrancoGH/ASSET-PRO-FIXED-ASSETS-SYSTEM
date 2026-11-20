"use client";

import { FaLock } from "react-icons/fa";
import { useAuth } from "../../context/AuthContext";

// Capa de interfaz: la protección real de los datos está en el backend
// (verifyRoles en auth.middleware.js).
// "permitido" (opcional) reemplaza la regla por rol: se usa para permisos
// configurables (ej. el Auditor con permiso de editar activos).
export default function RequireRole({ roles = [], permitido, children }) {
    const { userRole } = useAuth();
    const ok = permitido !== undefined ? permitido : roles.includes(userRole);

    if (!ok) {
        return (
            <div className="flex flex-col items-center justify-center h-96 text-stone-400">
                <FaLock size={40} className="mb-4 text-stone-400" />
                <h2 className="text-xl font-bold text-stone-100">Acceso denegado</h2>
                <p>Tu rol no tiene acceso a esta página.</p>
            </div>
        );
    }

    return <>{children}</>;
}
