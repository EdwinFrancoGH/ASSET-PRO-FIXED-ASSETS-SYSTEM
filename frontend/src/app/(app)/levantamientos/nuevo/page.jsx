"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import EncabezadoPagina from "../../../../components/ui/EncabezadoPagina";
import Seccion from "../../../../components/ui/Seccion";
import Cargando from "../../../../components/ui/Cargando";
import RequireRole from "../../../../components/auth/RequireRole";
import EncabezadoForm from "../../../../components/levantamientos/EncabezadoForm";
import { botonPrimario, botonSecundario } from "../../../../components/ui/estilos";
import { alertaError, toastExito } from "../../../../components/ui/alertas";
import { useAuth } from "../../../../context/AuthContext";
import { obtenerTodosLosCatalogos } from "../../../../services/catalogos.service";
import { obtenerAuditores } from "../../../../services/users.service";
import { crearLevantamiento } from "../../../../services/levantamientos.service";
import { marcarVisitaRealizada } from "../../../../services/programacion.service";
import { ROLES_LEVANTAMIENTO } from "../../../../utils/roles";
import { hoyISO, mensajeError } from "../../../../utils/formato";

export default function NuevoLevantamientoPage() {
    const router = useRouter();
    const { userData } = useAuth();
    const [catalogos, setCatalogos] = useState(null);
    const [auditores, setAuditores] = useState([]);
    const [datos, setDatos] = useState({
        sucursalId: "", areaId: "", responsableId: "", liderId: "", auditorId: userData.uid, fecha: hoyISO(), observacionesGenerales: "", cargarActivos: true
    });
    const [guardando, setGuardando] = useState(false);
    // Si viene de "Iniciar levantamiento" en la Programación: ?programacionId&sucursalId&areaId
    const [programacionId, setProgramacionId] = useState("");

    useEffect(() => {
        Promise.all([obtenerTodosLosCatalogos(true), obtenerAuditores()])
            .then(([c, a]) => {
                setCatalogos(c);
                setAuditores(a.data.data);
                const q = new URLSearchParams(window.location.search);
                const sucursalId = c.sucursales.some((s) => s.id === q.get("sucursalId")) ? q.get("sucursalId") : "";
                const area = c.areas.find((x) => x.id === q.get("areaId"));
                if (sucursalId || area) {
                    setDatos((d) => ({ ...d, sucursalId, areaId: area?.id || "", liderId: area?.liderId || d.liderId }));
                }
                setProgramacionId(q.get("programacionId") || "");
            })
            .catch((e) => alertaError(mensajeError(e, "No se pudieron cargar los catálogos.")));
    }, []);

    const crear = async (e) => {
        e.preventDefault();
        if (!datos.sucursalId && !datos.areaId) return alertaError("Indica la sucursal o el área que se va a levantar.");
        setGuardando(true);
        try {
            const { data } = await crearLevantamiento(datos);
            if (programacionId) await marcarVisitaRealizada(programacionId, data.data.id).catch(() => {});
            toastExito(data.message);
            router.push(`/levantamientos/${data.data.id}`);
        } catch (err) {
            alertaError(mensajeError(err));
            setGuardando(false);
        }
    };

    return (
        <RequireRole roles={ROLES_LEVANTAMIENTO}>
            <EncabezadoPagina titulo="Nuevo levantamiento" descripcion="Define qué se va a auditar. Después verificarás cada activo en sitio y generarás el acta." />
            {!catalogos ? <Cargando /> : (
                <form onSubmit={crear} className="space-y-6">
                    <Seccion titulo="Datos del levantamiento">
                        <EncabezadoForm datos={datos} setDatos={setDatos} catalogos={catalogos} setCatalogos={setCatalogos} auditores={auditores} />
                        <label className="mt-6 flex items-start gap-3 rounded-2xl bg-white/5 p-4 text-stone-200">
                            <input type="checkbox" checked={datos.cargarActivos} onChange={(e) => setDatos((d) => ({ ...d, cargarActivos: e.target.checked }))} className="mt-1 h-4 w-4" />
                            <span>
                                <strong className="text-white">Cargar los activos registrados</strong> en esa sucursal/área (y del responsable, si lo indicaste).
                                <span className="block text-sm text-stone-400">Luego solo marcas los que no encuentres. Si lo desmarcas, agregarás los activos uno por uno con el buscador.</span>
                            </span>
                        </label>
                    </Seccion>
                    <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                        <button type="button" onClick={() => router.push("/levantamientos")} className={botonSecundario}>Cancelar</button>
                        <button type="submit" disabled={guardando} className={botonPrimario}>{guardando ? "Creando..." : "Iniciar levantamiento"}</button>
                    </div>
                </form>
            )}
        </RequireRole>
    );
}
