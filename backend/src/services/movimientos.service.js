import db from "../config/firebase.js";
import { ROLES } from "../config/roles.js";
import { ESTADOS, TIPOS_MOVIMIENTO, LISTA_TIPOS_MOVIMIENTO, ETIQUETAS_MOVIMIENTO, ETIQUETAS_ESTADO } from "../config/activos.js";
import { ErrorHttp } from "../utils/errores.js";
import { hoyISO } from "../utils/fechas.js";
import { siguienteNumero, rellenar } from "../utils/contadores.js";
import { resolverReferencias } from "./referencias.service.js";
import { obtenerUsuariosPorRol, notificar } from "./notificaciones.service.js";

const t = (v) => String(v ?? "").trim();
const ubicacionDe = (a) => ({
    sucursalId: a.sucursalId || null, sucursalNombre: a.sucursalNombre || "",
    areaId: a.areaId || null, areaNombre: a.areaNombre || "",
    ubicacion: a.ubicacion || ""
});

// Reglas de cada tipo de movimiento (hoja MOVIMIENTOS del Excel):
//   ASIGNACION            → nuevo responsable; estado Asignado (puede cambiar ubicación)
//   TRASLADO              → cambia sucursal/área/ubicación (y opcionalmente responsable)
//   PRESTAMO              → responsable temporal; estado Prestado
//   DEVOLUCION            → sin responsable; estado Disponible
//   MANTENIMIENTO         → estado En reparación (recuerda el estado anterior)
//   RETORNO_MANTENIMIENTO → vuelve al estado que tenía antes del mantenimiento
//   BAJA                  → estado Baja (definitivo, motivo obligatorio)
const PERMITIDOS_DESDE = {
    ASIGNACION: [ESTADOS.DISPONIBLE, ESTADOS.ASIGNADO],
    TRASLADO: [ESTADOS.DISPONIBLE, ESTADOS.ASIGNADO, ESTADOS.PRESTADO],
    PRESTAMO: [ESTADOS.DISPONIBLE, ESTADOS.ASIGNADO],
    DEVOLUCION: [ESTADOS.ASIGNADO, ESTADOS.PRESTADO],
    MANTENIMIENTO: [ESTADOS.DISPONIBLE, ESTADOS.ASIGNADO, ESTADOS.PRESTADO],
    RETORNO_MANTENIMIENTO: [ESTADOS.EN_REPARACION],
    BAJA: [ESTADOS.DISPONIBLE, ESTADOS.ASIGNADO, ESTADOS.PRESTADO, ESTADOS.EN_REPARACION]
};

// Calcula los cambios que el movimiento hace en el activo (sin guardar).
export const calcularCambios = async (activo, datos) => {
    const tipo = datos.tipo;
    if (!LISTA_TIPOS_MOVIMIENTO.includes(tipo)) throw new ErrorHttp(400, "Selecciona un tipo de movimiento válido.");
    if (!PERMITIDOS_DESDE[tipo].includes(activo.estado)) {
        throw new ErrorHttp(400, `No se puede registrar "${ETIQUETAS_MOVIMIENTO[tipo]}" a un activo en estado "${ETIQUETAS_ESTADO[activo.estado] || activo.estado}".`);
    }

    const cambiaUbicacion = ["ASIGNACION", "TRASLADO", "PRESTAMO"].includes(tipo);
    const refs = await resolverReferencias({
        sucursalId: cambiaUbicacion && datos.sucursalId !== undefined ? datos.sucursalId || null : undefined,
        areaId: cambiaUbicacion && datos.areaId !== undefined ? datos.areaId || null : undefined,
        responsableId: datos.responsableId ? datos.responsableId : undefined
    });

    const cambios = {};
    if (cambiaUbicacion) {
        if (datos.sucursalId !== undefined) Object.assign(cambios, { sucursalId: refs.sucursal?.id || null, sucursalNombre: refs.sucursal?.nombre || "" });
        if (datos.areaId !== undefined) Object.assign(cambios, { areaId: refs.area?.id || null, areaNombre: refs.area?.nombre || "", liderNombre: refs.area?.liderNombre || "" });
        if (datos.ubicacion !== undefined) cambios.ubicacion = t(datos.ubicacion);
    }

    const ponerResponsable = (obligatorio) => {
        if (!refs.responsable) {
            if (obligatorio) throw new ErrorHttp(400, "Selecciona el asociado que recibe el activo.");
            return;
        }
        Object.assign(cambios, { responsableId: refs.responsable.id, responsableNombre: refs.responsable.nombre });
    };

    switch (tipo) {
        case TIPOS_MOVIMIENTO.ASIGNACION:
            ponerResponsable(true);
            if (cambios.responsableId === activo.responsableId) throw new ErrorHttp(400, "El activo ya está asignado a ese asociado. Usa Traslado si solo cambia la ubicación.");
            cambios.estado = ESTADOS.ASIGNADO;
            break;
        case TIPOS_MOVIMIENTO.TRASLADO: {
            ponerResponsable(false);
            const antes = ubicacionDe(activo);
            const despues = { ...antes, ...cambios };
            const hayCambio = antes.sucursalId !== despues.sucursalId || antes.areaId !== despues.areaId || antes.ubicacion !== despues.ubicacion ||
                (cambios.responsableId && cambios.responsableId !== activo.responsableId);
            if (!hayCambio) throw new ErrorHttp(400, "Indica el nuevo destino (sucursal, área, ubicación o responsable).");
            if (cambios.responsableId && activo.estado === ESTADOS.DISPONIBLE) cambios.estado = ESTADOS.ASIGNADO;
            break;
        }
        case TIPOS_MOVIMIENTO.PRESTAMO:
            ponerResponsable(true);
            if (datos.fechaDevolucion && !/^\d{4}-\d{2}-\d{2}$/.test(datos.fechaDevolucion)) throw new ErrorHttp(400, "La fecha de devolución no es válida.");
            cambios.estado = ESTADOS.PRESTADO;
            cambios.prestamo = {
                fechaDevolucion: datos.fechaDevolucion || null,
                responsableAnteriorId: activo.responsableId || null,
                responsableAnteriorNombre: activo.responsableNombre || ""
            };
            break;
        case TIPOS_MOVIMIENTO.DEVOLUCION:
            Object.assign(cambios, { responsableId: null, responsableNombre: "", estado: ESTADOS.DISPONIBLE, prestamo: null });
            break;
        case TIPOS_MOVIMIENTO.MANTENIMIENTO:
            Object.assign(cambios, { estado: ESTADOS.EN_REPARACION, estadoAntesMantenimiento: activo.estado });
            break;
        case TIPOS_MOVIMIENTO.RETORNO_MANTENIMIENTO:
            cambios.estado = activo.estadoAntesMantenimiento || (activo.responsableId ? ESTADOS.ASIGNADO : ESTADOS.DISPONIBLE);
            cambios.estadoAntesMantenimiento = null;
            if (datos.condicion) cambios.condicion = datos.condicion;
            break;
        case TIPOS_MOVIMIENTO.BAJA:
            if (t(datos.comentario).length < 5) throw new ErrorHttp(400, "Indica el motivo de la baja en el comentario (mínimo 5 caracteres).");
            Object.assign(cambios, { estado: ESTADOS.BAJA, fechaBaja: datos.fecha || hoyISO(), motivoBaja: t(datos.comentario) });
            break;
        default:
            break;
    }
    return cambios;
};

// Registra un movimiento y aplica sus cambios al activo en una transacción.
// opciones.numero / opciones.comentario permiten reutilizarlo desde el cierre
// de un levantamiento.
export const registrar = async (activoId, datos, usuario) => {
    if (datos.fecha && !/^\d{4}-\d{2}-\d{2}$/.test(datos.fecha)) throw new ErrorHttp(400, "La fecha del movimiento no es válida.");
    const hoy = hoyISO();
    if (datos.fecha && datos.fecha > hoy) throw new ErrorHttp(400, "La fecha del movimiento no puede ser futura.");

    const ref = db.collection("activos").doc(activoId);
    const previo = await ref.get();
    if (!previo.exists) throw new ErrorHttp(404, "Activo no encontrado.");

    // Se calcula fuera de la transacción (lee catálogos) y se vuelve a
    // comprobar el estado dentro de ella.
    const cambios = await calcularCambios({ id: activoId, ...previo.data() }, datos);
    const numero = `MOV-${rellenar(await siguienteNumero("movimientos"), 5)}`;
    const movRef = db.collection("movimientos").doc();

    const movimiento = await db.runTransaction(async (tx) => {
        const doc = await tx.get(ref);
        const activo = doc.data();
        if (activo.estado !== previo.data().estado || activo.responsableId !== previo.data().responsableId) {
            throw new ErrorHttp(409, "El activo cambió mientras registrabas el movimiento. Recarga e inténtalo de nuevo.");
        }
        const despues = { ...activo, ...cambios };
        const mov = {
            numero,
            activoId,
            idActivo: activo.idActivo,
            codigo: activo.codigo,
            activoDescripcion: activo.descripcion,
            tipo: datos.tipo,
            fecha: datos.fecha || hoy,
            origen: ubicacionDe(activo),
            destino: ubicacionDe(despues),
            responsableAnteriorId: activo.responsableId || null,
            responsableAnteriorNombre: activo.responsableNombre || "",
            responsableNuevoId: despues.responsableId || null,
            responsableNuevoNombre: despues.responsableNombre || "",
            estadoAnterior: activo.estado,
            estadoNuevo: despues.estado,
            comentario: t(datos.comentario),
            fechaDevolucion: datos.tipo === "PRESTAMO" ? datos.fechaDevolucion || null : null,
            levantamientoId: datos.levantamientoId || null,
            usuarioId: usuario.uid,
            usuarioNombre: usuario.name,
            fechaRegistro: new Date().toISOString()
        };
        tx.update(ref, { ...cambios, fechaActualizacion: mov.fechaRegistro });
        tx.set(movRef, mov);
        return mov;
    });

    if (datos.tipo === TIPOS_MOVIMIENTO.BAJA) {
        const admins = await obtenerUsuariosPorRol(ROLES.ADMIN, ROLES.INVENTARIO);
        notificar({
            usuarioIds: admins.map((u) => u.uid),
            excluir: usuario.uid,
            titulo: "Activo dado de baja",
            mensaje: `${usuario.name} dio de baja ${movimiento.codigo} (${movimiento.activoDescripcion}). Motivo: ${movimiento.comentario}`,
            enlace: `/activos/${activoId}`
        });
    }

    return { id: movRef.id, ...movimiento };
};

export const listar = async (filtros = {}) => {
    const snapshot = await db.collection("movimientos").get();
    const q = t(filtros.q).toLowerCase();
    const tipos = filtros.tipo ? String(filtros.tipo).split(",") : null;
    return snapshot.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .filter((m) => !tipos || tipos.includes(m.tipo))
        .filter((m) => !filtros.activoId || m.activoId === filtros.activoId)
        .filter((m) => !filtros.desde || m.fecha >= filtros.desde)
        .filter((m) => !filtros.hasta || m.fecha <= filtros.hasta)
        .filter((m) => !q || [m.numero, m.idActivo, m.codigo, m.activoDescripcion, m.responsableAnteriorNombre, m.responsableNuevoNombre, m.comentario, m.usuarioNombre]
            .some((v) => String(v || "").toLowerCase().includes(q)))
        .sort((a, b) => b.fechaRegistro.localeCompare(a.fechaRegistro));
};
