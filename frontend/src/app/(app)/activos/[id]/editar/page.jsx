"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import EncabezadoPagina from "../../../../../components/ui/EncabezadoPagina";
import Cargando from "../../../../../components/ui/Cargando";
import RequireRole from "../../../../../components/auth/RequireRole";
import ActivoForm from "../../../../../components/activos/ActivoForm";
import { alertaError, toastExito } from "../../../../../components/ui/alertas";
import { obtenerActivo, actualizarActivo } from "../../../../../services/activos.service";
import { ROLES_GESTION } from "../../../../../utils/roles";
import { mensajeError } from "../../../../../utils/formato";

export default function EditarActivoPage() {
    const { id } = useParams();
    const router = useRouter();
    const [activo, setActivo] = useState(null);

    useEffect(() => {
        obtenerActivo(id)
            .then(({ data }) => setActivo(data.data))
            .catch((e) => {
                alertaError(mensajeError(e));
                router.replace("/activos");
            });
    }, [id, router]);

    const guardar = async (datos) => {
        try {
            const { descripcion, marca, modelo, serie, condicion, fechaCompra, valorCompra, vidaUtilAnios, observaciones, foto } = datos;
            const { data } = await actualizarActivo(id, { descripcion, marca, modelo, serie, condicion, fechaCompra, valorCompra, vidaUtilAnios, observaciones, foto });
            toastExito(data.message);
            router.push(`/activos/${id}`);
        } catch (e) {
            alertaError(mensajeError(e));
        }
    };

    return (
        <RequireRole roles={ROLES_GESTION}>
            {!activo ? <Cargando /> : (
                <>
                    <EncabezadoPagina titulo={`Editar ${activo.codigo}`} descripcion="El responsable, la ubicación y el estado cambian con un movimiento (queda historial)." />
                    <ActivoForm inicial={{ ...activo, valorCompra: activo.valorCompra ?? "", vidaUtilAnios: activo.vidaUtilAnios ?? "", fechaCompra: activo.fechaCompra || "" }} onGuardar={guardar} onCancelar={() => router.push(`/activos/${id}`)} textoBoton="Guardar cambios" />
                </>
            )}
        </RequireRole>
    );
}
