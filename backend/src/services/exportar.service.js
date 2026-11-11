import ExcelJS from "exceljs";
import { ETIQUETAS_ESTADO, ETIQUETAS_CONDICION, ETIQUETAS_MOVIMIENTO } from "../config/activos.js";

const fechaHora = (iso) => (iso ? new Date(iso).toLocaleString("es-SV", { timeZone: "America/El_Salvador" }) : "");

// Mismas columnas que la hoja MAIN (CONSOLIDADO DE ACTIVOS) del Excel, más
// los cálculos de depreciación.
const COLUMNAS_ACTIVOS = [
    { header: "IDActivo", width: 12, valor: (a) => a.idActivo },
    { header: "EQUIPO", width: 18, valor: (a) => a.tipoNombre },
    { header: "CodigoActivo", width: 13, valor: (a) => a.codigo },
    { header: "Descripcion", width: 32, valor: (a) => a.descripcion },
    { header: "Marca", width: 14, valor: (a) => a.marca },
    { header: "Modelo", width: 18, valor: (a) => a.modelo },
    { header: "Serie", width: 16, valor: (a) => a.serie },
    { header: "Estado", width: 14, valor: (a) => ETIQUETAS_ESTADO[a.estado] || a.estado },
    { header: "Condición", width: 11, valor: (a) => ETIQUETAS_CONDICION[a.condicion] || "" },
    { header: "Responsable activo", width: 24, valor: (a) => a.responsableNombre },
    { header: "Sucursal", width: 16, valor: (a) => a.sucursalNombre },
    { header: "Área", width: 18, valor: (a) => a.areaNombre },
    { header: "Lider de area", width: 20, valor: (a) => a.liderNombre },
    { header: "Ubicacion", width: 18, valor: (a) => a.ubicacion },
    { header: "Fecha auditoria", width: 14, valor: (a) => a.ultimaAuditoria?.fecha || "" },
    { header: "AUDITADO POR", width: 20, valor: (a) => a.ultimaAuditoria?.auditorNombre || "" },
    { header: "Levantamiento", width: 15, valor: (a) => a.ultimaAuditoria?.numero || "" },
    { header: "No localizado", width: 12, valor: (a) => (a.noLocalizado ? "Sí" : "") },
    { header: "Observaciones", width: 32, valor: (a) => a.observaciones, largo: true },
    { header: "FechaCompra", width: 13, valor: (a) => a.fechaCompra || "" },
    { header: "ValorCompra", width: 13, valor: (a) => a.valorCompra, numero: true },
    { header: "VidaUtilAnios", width: 11, valor: (a) => a.vidaUtilAnios, numero: true, entero: true },
    { header: "DepreciacionMensual", width: 14, valor: (a) => a.depreciacionMensual, numero: true },
    { header: "Meses de uso", width: 11, valor: (a) => a.mesesUso, numero: true, entero: true },
    { header: "Depreciación acumulada", width: 15, valor: (a) => a.depreciacionAcumulada, numero: true },
    { header: "Valor en libros", width: 14, valor: (a) => a.valorLibros, numero: true }
];

const COLUMNAS_MOVIMIENTOS = [
    { header: "IDMovimiento", width: 13, valor: (m) => m.numero },
    { header: "IDActivo", width: 12, valor: (m) => m.idActivo },
    { header: "CodigoActivo", width: 13, valor: (m) => m.codigo },
    { header: "Activo", width: 28, valor: (m) => m.activoDescripcion },
    { header: "Fecha", width: 12, valor: (m) => m.fecha },
    { header: "TipoMovimiento", width: 22, valor: (m) => ETIQUETAS_MOVIMIENTO[m.tipo] || m.tipo },
    { header: "UbicacionOrigen", width: 30, valor: (m) => [m.origen?.sucursalNombre, m.origen?.areaNombre, m.origen?.ubicacion].filter(Boolean).join(" / ") },
    { header: "UbicacionDestino", width: 30, valor: (m) => [m.destino?.sucursalNombre, m.destino?.areaNombre, m.destino?.ubicacion].filter(Boolean).join(" / ") },
    { header: "ResponsableAnterior", width: 22, valor: (m) => m.responsableAnteriorNombre },
    { header: "ResponsableNuevo", width: 22, valor: (m) => m.responsableNuevoNombre },
    { header: "Estado anterior", width: 14, valor: (m) => ETIQUETAS_ESTADO[m.estadoAnterior] || "" },
    { header: "Estado nuevo", width: 14, valor: (m) => ETIQUETAS_ESTADO[m.estadoNuevo] || "" },
    { header: "Comentario", width: 36, valor: (m) => m.comentario, largo: true },
    { header: "UsuarioMovimiento", width: 20, valor: (m) => m.usuarioNombre },
    { header: "FechaHoraRegistro", width: 20, valor: (m) => fechaHora(m.fechaRegistro) }
];

const agregarHoja = (libro, nombre, columnas, filas) => {
    const hoja = libro.addWorksheet(nombre, { views: [{ state: "frozen", xSplit: 1, ySplit: 1 }] });
    hoja.columns = columnas.map(({ header, width }, i) => ({ header, key: `c${i}`, width }));
    const encabezado = hoja.getRow(1);
    encabezado.height = 30;
    encabezado.eachCell((celda) => {
        celda.font = { bold: true, color: { argb: "FFFFFFFF" } };
        celda.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF7F1D1D" } };
        celda.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
    });
    filas.forEach((f) => {
        const fila = {};
        columnas.forEach((c, i) => {
            const v = c.valor(f);
            fila[`c${i}`] = c.numero ? (v === null || v === undefined || v === "" ? null : Number(v)) : (v ?? "");
        });
        hoja.addRow(fila);
    });
    columnas.forEach((c, i) => {
        const col = hoja.getColumn(i + 1);
        if (c.numero) col.numFmt = c.entero ? "0" : "#,##0.00";
        if (c.largo) col.alignment = { wrapText: true, vertical: "top" };
    });
    hoja.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: columnas.length } };
    return hoja;
};

export const excelActivos = async (activos, { generadoPor }) => {
    const libro = new ExcelJS.Workbook();
    libro.creator = "ASSET PRO Fixed Assets";
    libro.created = new Date();
    agregarHoja(libro, "Consolidado de activos", COLUMNAS_ACTIVOS, activos);

    const suma = (campo) => activos.reduce((s, a) => s + (Number(a[campo]) || 0), 0);
    const resumen = libro.addWorksheet("Resumen");
    resumen.columns = [{ width: 30 }, { width: 18 }];
    [["Generado por", generadoPor], ["Fecha", fechaHora(new Date().toISOString())], ["Activos", activos.length], [],
     ["Valor de compra", suma("valorCompra")], ["Depreciación acumulada", suma("depreciacionAcumulada")],
     ["Valor en libros", suma("valorLibros")], ["Depreciación mensual", suma("depreciacionMensual")]]
        .forEach((f) => {
            const fila = resumen.addRow(f);
            if (typeof f[1] === "number" && f[0] !== "Activos") fila.getCell(2).numFmt = "#,##0.00";
        });
    return libro.xlsx.writeBuffer();
};

export const excelMovimientos = async (movimientos, { generadoPor }) => {
    const libro = new ExcelJS.Workbook();
    libro.creator = "ASSET PRO Fixed Assets";
    agregarHoja(libro, "Movimientos", COLUMNAS_MOVIMIENTOS, movimientos);
    const info = libro.addWorksheet("Info");
    info.columns = [{ width: 20 }, { width: 30 }];
    info.addRow(["Generado por", generadoPor]);
    info.addRow(["Fecha", fechaHora(new Date().toISOString())]);
    info.addRow(["Movimientos", movimientos.length]);
    return libro.xlsx.writeBuffer();
};
