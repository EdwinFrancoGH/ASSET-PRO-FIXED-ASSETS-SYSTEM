"use client";

import { useRouter } from "next/navigation";
import EncabezadoPagina from "../../../../components/ui/EncabezadoPagina";
import RequireRole from "../../../../components/auth/RequireRole";
import ActivoForm from "../../../../components/activos/ActivoForm";
import { alertaError, toastExito } from "../../../../components/ui/alertas";
import { crearActivo } from "../../../../services/activos.service";
import { ROLES_GESTION } from "../../../../utils/roles";
import { mensajeError } from "../../../../utils/formato";

export default function NuevoActivoPage() {
    const router = useRouter();

    const guardar = async (datos) => {
        try {
            const { data } = await crearActivo(datos);
            toastExito(data.message);
            router.push(`/activos/${data.data.id}`);
        } catch (e) {
            alertaError(mensajeError(e));
        }
    };

    return (
        <RequireRole roles={ROLES_GESTION}>
            <EncabezadoPagina titulo="Registrar activo" descripcion="El IDActivo (ACT-#####) y el código por tipo (LAP-0001) se generan automáticamente." />
            <ActivoForm onGuardar={guardar} onCancelar={() => router.push("/activos")} textoBoton="Registrar activo" />
        </RequireRole>
    );
}
