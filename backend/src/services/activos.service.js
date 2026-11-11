import db from "../config/firebase.js";
import { ROLES } from "../config/roles.js";
import {
    ESTADOS, LISTA_ESTADOS, LISTA_CONDICIONES, CONDICIONES, DIAS_SIN_AUDITAR,
    calcularDepreciacion, prefijoDeNombre
} from "../config/activos.js";
import { ErrorHttp } from "../utils/errores.js";
import { hoyISO } from "../utils/fechas.js";
import { siguienteNumero, rellenar } from "../utils/contadores.js";
import { resolverReferencias } from "./referencias.service.js";

const COLECCION = "activos";
const t = (v) => String(v ?? "").trim();
const numeroONull = (v) => (v === "" || v === null || v === undefined ? null : Number(v));

// Datos calculados que se agregan al leer (no se guardan).
export const conCalculos = (activo) => ({ ...activo, ...calcularDepreciacion(activo) });

// En la lista no viaja la foto (pesa); el detalle sí la trae.
const sinFoto = ({ foto, ...resto }) => ({ ...resto, tieneFoto: Boolean(foto) });

export const leerActivo = async (id) => {
    if (!/^[A-Za-z0-9_-]{1,64}$/.test(String(id || ""))) return null;
    const doc = await db.collection(COLECCION).doc(id).get();
    return doc.exists ? { id: doc.id, ...doc.data() } : null;
};

// Código del activo por tipo: LAP-0001, IMP-0002… (columna CodigoActivo del Excel).
export const generarCodigos = async (tipo) => {
    const prefijo = tipo.prefijo || prefijoDeNombre(tipo.nombre);
    const [general, porTipo] = await Promise.all([siguienteNumero("activos"), siguienteNumero(`tipo_${prefijo}`)]);
    return { idActivo: `ACT-${rellenar(general, 5)}`, codigo: `${prefijo}-${rellenar(porTipo, 4)}` };
};

// ---------------------------------------------------------------- validación
const FOTO_VALIDA = /^data:image\/jpeg;base64,[A-Za-z0-9+/]+={0,2}$/;

const validarDescriptivos = (d, { parcial = false } = {}) => {
    if (!parcial || d.descripcion !== undefined) {
        if (t(d.descripcion).length < 3) return "Escribe la descripción del activo (mínimo 3 caracteres).";
    }
    if (d.valorCompra !== undefined && d.valorCompra !== "" && d.valorCompra !== null) {
        const v = Number(d.valorCompra);
        if (!Number.isFinite(v) || v < 0) return "El valor de compra debe ser un número mayor o igual a 0.";
    }
    if (d.vidaUtilAnios !== undefined && d.vidaUtilAnios !== "" && d.vidaUtilAnios !== null) {
        const v = Number(d.vidaUtilAnios);
        if (!Number.isFinite(v) || v <= 0 || v > 100) return "La vida útil debe ser un número de años mayor que 0.";
    }
    if (d.fechaCompra && !/^\d{4}-\d{2}-\d{2}$/.test(d.fechaCompra)) return "La fecha de compra no es válida.";
    if (d.fechaCompra && d.fechaCompra > hoyISO()) return "La fecha de compra no puede ser futura.";
    if (d.condicion && !LISTA_CONDICIONES.includes(d.condicion)) return "Condición no válida.";
    if (d.foto && (typeof d.foto !== "string" || d.foto.length > 1_400_000 || !FOTO_VALIDA.test(d.foto))) {
        return "La foto debe ser una imagen JPEG válida y no superar el tamaño permitido.";
    }
    return null;
};

const descriptivos = (d) => ({
    descripcion: t(d.descripcion),
    marca: t(d.marca),
    modelo: t(d.modelo),
    serie: t(d.serie).toUpperCase(),
    fechaCompra: d.fechaCompra || null,
    valorCompra: numeroONull(d.valorCompra),
    vidaUtilAnios: numeroONull(d.vidaUtilAnios),
    observaciones: t(d.observaciones),
    condicion: d.condicion || CONDICIONES.BUENO
});

const serieRepetida = async (serie, idActual = null) => {
    if (!serie) return null;
    const snap = await db.collection(COLECCION).where("serie", "==", serie).get();
    return snap.docs.find((d) => d.id !== idActual)?.data() || null;
};

// ---------------------------------------------------------------- consultas
export const listar = async (filtros = {}) => {
    const snapshot = await db.collection(COLECCION).get();
    const q = t(filtros.q).toLowerCase();
    const estados = filtros.estado ? String(filtros.estado).split(",") : null;

    return snapshot.docs
        .map((doc) => ({ id: doc.id, ...doc.data() }))
        .filter((a) => (estados ? estados.includes(a.estado) : filtros.incluirBajas === "true" || a.estado !== ESTADOS.BAJA))
        .filter((a) => !filtros.tipoId || a.tipoId === filtros.tipoId)
        .filter((a) => !filtros.sucursalId || a.sucursalId === filtros.sucursalId)
        .filter((a) => !filtros.areaId || a.areaId === filtros.areaId)
        .filter((a) => !filtros.responsableId || a.responsableId === filtros.responsableId)
        .filter((a) => filtros.noLocalizado !== "true" || a.noLocalizado === true)
        .filter((a) => {
            if (filtros.sinAuditar !== "true") return true;
            const limite = new Date(Date.now() - DIAS_SIN_AUDITAR * 86400000).toISOString().slice(0, 10);
            return !a.ultimaAuditoria?.fecha || a.ultimaAuditoria.fecha < limite;
        })
        .filter((a) => !q || [a.idActivo, a.codigo, a.descripcion, a.marca, a.modelo, a.serie, a.responsableNombre, a.tipoNombre, a.ubicacion]
            .some((v) => String(v || "").toLowerCase().includes(q)))
        .sort((a, b) => (a.idActivo || "").localeCompare(b.idActivo || ""))
        .map((a) => conCalculos(sinFoto(a)));
};

export const obtener = async (id) => {
    const activo = await leerActivo(id);
    if (!activo) throw new ErrorHttp(404, "Activo no encontrado.");

    const [movs, levs] = await Promise.all([
        db.collection("movimientos").where("activoId", "==", id).get(),
        db.collection("levantamientos").where("activoIds", "array-contains", id).get()
    ]);

    const movimientos = movs.docs.map((d) => ({ id: d.id, ...d.data() })).sort((a, b) => b.fechaRegistro.localeCompare(a.fechaRegistro));
    const levantamientos = levs.docs
        .map((d) => {
            const l = d.data();
            const linea = (l.lineas || []).find((x) => x.activoId === id) || {};
            return { id: d.id, numero: l.numero, fecha: l.fecha, estado: l.estado, auditorNombre: l.auditorNombre, encontrado: linea.encontrado, condicion: linea.condicion, observaciones: linea.observaciones };
        })
        .sort((a, b) => b.fecha.localeCompare(a.fecha));

    return { ...conCalculos(activo), movimientos, levantamientos };
};

// --------------------------------------------------------------- escritura
const registrarAlta = (activoRef, activo, usuario, numero) =>
    db.collection("movimientos").doc().set({
        numero,
        activoId: activoRef.id,
        idActivo: activo.idActivo,
        codigo: activo.codigo,
        activoDescripcion: activo.descripcion,
        tipo: "ALTA",
        fecha: hoyISO(),
        origen: null,
        destino: { sucursalNombre: activo.sucursalNombre, areaNombre: activo.areaNombre, ubicacion: activo.ubicacion },
        responsableAnteriorNombre: "",
        responsableNuevoNombre: activo.responsableNombre,
        estadoAnterior: null,
        estadoNuevo: activo.estado,
        comentario: activo.origenAlta || "Registro del activo en el sistema.",
        usuarioId: usuario.uid,
        usuarioNombre: usuario.name,
        fechaRegistro: new Date().toISOString()
    });

// Construye un activo nuevo ya validado. Lo usan el alta manual y los
// hallazgos de un levantamiento.
export const prepararActivo = async (datos, usuario, extra = {}) => {
    const error = validarDescriptivos(datos);
    if (error) throw new ErrorHttp(400, error);
    if (!datos.tipoId) throw new ErrorHttp(400, "Selecciona el tipo de activo (equipo).");

    const { tipo, sucursal, area, responsable } = await resolverReferencias({
        tipoId: datos.tipoId, sucursalId: datos.sucursalId || null, areaId: datos.areaId || null, responsableId: datos.responsableId || null
    });

    const base = descriptivos(datos);
    if (base.vidaUtilAnios === null && tipo.vidaUtilAnios) base.vidaUtilAnios = tipo.vidaUtilAnios;

    const repetida = await serieRepetida(base.serie);
    if (repetida) throw new ErrorHttp(400, `La serie ${base.serie} ya está registrada en el activo ${repetida.idActivo} (${repetida.codigo}).`);

    const codigos = await generarCodigos(tipo);
    const ahora = new Date().toISOString();

    return {
        ...codigos,
        ...base,
        tipoId: tipo.id,
        tipoNombre: tipo.nombre,
        sucursalId: sucursal?.id || null,
        sucursalNombre: sucursal?.nombre || "",
        areaId: area?.id || null,
        areaNombre: area?.nombre || "",
        liderNombre: area?.liderNombre || "",
        ubicacion: t(datos.ubicacion),
        responsableId: responsable?.id || null,
        responsableNombre: responsable?.nombre || "",
        estado: responsable ? ESTADOS.ASIGNADO : ESTADOS.DISPONIBLE,
        foto: datos.foto || null,
        noLocalizado: false,
        ultimaAuditoria: null,
        creadoPorId: usuario.uid,
        creadoPorNombre: usuario.name,
        fechaCreacion: ahora,
        fechaActualizacion: ahora,
        ...extra
    };
};

export const crear = async (datos, usuario) => {
    const activo = await prepararActivo(datos, usuario);
    const ref = db.collection(COLECCION).doc();
    await ref.set(activo);
    const numero = `MOV-${rellenar(await siguienteNumero("movimientos"), 5)}`;
    await registrarAlta(ref, activo, usuario, numero);
    return conCalculos({ id: ref.id, ...activo });
};

export { registrarAlta };

// Solo datos descriptivos, financieros, condición y foto. Responsable,
// ubicación y estado cambian únicamente con un movimiento (queda historial).
export const actualizar = async (id, datos, usuario) => {
    const activo = await leerActivo(id);
    if (!activo) throw new ErrorHttp(404, "Activo no encontrado.");
    if (activo.estado === ESTADOS.BAJA) throw new ErrorHttp(400, "El activo está dado de baja: ya no se puede modificar.");

    const error = validarDescriptivos({ ...activo, ...datos });
    if (error) throw new ErrorHttp(400, error);

    const cambios = descriptivos({ ...activo, ...datos });
    const repetida = await serieRepetida(cambios.serie, id);
    if (repetida) throw new ErrorHttp(400, `La serie ${cambios.serie} ya está registrada en el activo ${repetida.idActivo} (${repetida.codigo}).`);

    if (Object.prototype.hasOwnProperty.call(datos, "foto")) cambios.foto = datos.foto || null;
    cambios.fechaActualizacion = new Date().toISOString();
    cambios.actualizadoPorNombre = usuario.name;

    await db.collection(COLECCION).doc(id).update(cambios);
    return conCalculos({ ...activo, ...cambios });
};

// Eliminar solo si se registró por error (sin movimientos ni levantamientos).
// En cualquier otro caso se usa el movimiento "Baja".
export const eliminar = async (id, usuario) => {
    if (usuario.role !== ROLES.ADMIN) throw new ErrorHttp(403, "Solo el Administrador puede eliminar activos.");
    const activo = await leerActivo(id);
    if (!activo) throw new ErrorHttp(404, "Activo no encontrado.");

    const [movs, levs] = await Promise.all([
        db.collection("movimientos").where("activoId", "==", id).get(),
        db.collection("levantamientos").where("activoIds", "array-contains", id).limit(1).get()
    ]);
    if (movs.docs.some((d) => d.data().tipo !== "ALTA") || !levs.empty) {
        throw new ErrorHttp(400, "El activo ya tiene movimientos o levantamientos. Regístrale una Baja en lugar de eliminarlo.");
    }
    const batch = db.batch();
    movs.docs.forEach((d) => batch.delete(d.ref));
    batch.delete(db.collection(COLECCION).doc(id));
    await batch.commit();
};

// ------------------------------------------------------------------ panel
export const resumen = async () => {
    const [activosSnap, movsSnap, levsSnap] = await Promise.all([
        db.collection(COLECCION).get(),
        db.collection("movimientos").get(),
        db.collection("levantamientos").where("estado", "==", "EN_PROCESO").get()
    ]);

    const todos = activosSnap.docs.map((d) => conCalculos({ id: d.id, ...d.data() }));
    const vigentes = todos.filter((a) => a.estado !== ESTADOS.BAJA);
    const limite = new Date(Date.now() - DIAS_SIN_AUDITAR * 86400000).toISOString().slice(0, 10);
    const suma = (lista, campo) => Math.round(lista.reduce((s, a) => s + (Number(a[campo]) || 0), 0) * 100) / 100;

    const agrupar = (campo, lista = vigentes) => {
        const mapa = {};
        lista.forEach((a) => {
            const k = a[campo] || "Sin asignar";
            mapa[k] = mapa[k] || { nombre: k, cantidad: 0, valor: 0 };
            mapa[k].cantidad += 1;
            mapa[k].valor = Math.round((mapa[k].valor + (Number(a.valorCompra) || 0)) * 100) / 100;
        });
        return Object.values(mapa).sort((a, b) => b.cantidad - a.cantidad);
    };

    const porEstado = Object.fromEntries(LISTA_ESTADOS.map((e) => [e, todos.filter((a) => a.estado === e).length]));

    return {
        total: vigentes.length,
        bajas: porEstado.BAJA,
        porEstado,
        valorCompra: suma(vigentes, "valorCompra"),
        valorLibros: suma(vigentes, "valorLibros"),
        depreciacionMensual: suma(vigentes.filter((a) => a.valorLibros > 0), "depreciacionMensual"),
        sinAuditar: vigentes.filter((a) => !a.ultimaAuditoria?.fecha || a.ultimaAuditoria.fecha < limite).length,
        noLocalizados: vigentes.filter((a) => a.noLocalizado).length,
        diasSinAuditar: DIAS_SIN_AUDITAR,
        porTipo: agrupar("tipoNombre"),
        porSucursal: agrupar("sucursalNombre"),
        levantamientosEnProceso: levsSnap.size,
        ultimosMovimientos: movsSnap.docs
            .map((d) => ({ id: d.id, ...d.data() }))
            .sort((a, b) => b.fechaRegistro.localeCompare(a.fechaRegistro))
            .slice(0, 8)
    };
};
