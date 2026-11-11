import PDFDocument from "pdfkit";
import { ETIQUETAS_CONDICION } from "../config/activos.js";

// ACTA DE VALIDACIÓN DE ACTIVOS FIJOS (hoja ACTA del Excel), generada a
// partir de un levantamiento. Carta vertical.
const ROJO = "#991b1b";
const GRIS = "#57534e";
const BORDE = "#d6d3d1";

const fechaLarga = (iso) => {
    if (!iso) return "";
    const [a, m, d] = iso.slice(0, 10).split("-").map(Number);
    return new Date(a, m - 1, d).toLocaleDateString("es-SV", { day: "numeric", month: "long", year: "numeric" });
};

const COLUMNAS = [
    { titulo: "#", ancho: 20, valor: (l, i) => String(i + 1) },
    { titulo: "Código", ancho: 54, valor: (l) => l.codigo || "Nuevo" },
    { titulo: "Equipo", ancho: 64, valor: (l) => l.tipoNombre },
    { titulo: "Descripción", ancho: 120, valor: (l) => l.descripcion },
    { titulo: "Marca / Modelo", ancho: 88, valor: (l) => [l.marca, l.modelo].filter(Boolean).join(" ") },
    { titulo: "Serie", ancho: 68, valor: (l) => l.serie },
    { titulo: "Condición", ancho: 48, valor: (l) => (l.encontrado ? ETIQUETAS_CONDICION[l.condicion] || "" : "—") },
    { titulo: "Verificado", ancho: 54, valor: (l) => (l.esHallazgo ? "Hallazgo" : l.encontrado ? "Encontrado" : "No localizado") }
];

export const generarActaPdf = (lev, { responsableInventario }) =>
    new Promise((resolve, reject) => {
        const doc = new PDFDocument({ size: "LETTER", margins: { top: 48, bottom: 48, left: 48, right: 48 }, bufferPages: true, info: { Title: `Acta ${lev.numero}`, Author: "ASSET PRO Fixed Assets" } });
        const partes = [];
        doc.on("data", (c) => partes.push(c));
        doc.on("end", () => resolve(Buffer.concat(partes)));
        doc.on("error", reject);

        const ancho = doc.page.width - 96;
        const x0 = 48;

        // Encabezado
        doc.rect(0, 0, doc.page.width, 78).fill("#1c0a0a");
        doc.fillColor("#ffffff").font("Helvetica-Bold").fontSize(16).text("ASSET PRO ", x0, 24, { continued: true }).fillColor("#f87171").text("FIXED ASSETS");
        doc.fillColor("#e7e5e4").font("Helvetica").fontSize(9).text(`Levantamiento ${lev.numero}${lev.estado !== "CERRADO" ? "  ·  BORRADOR (levantamiento en proceso)" : ""}`, x0, 46);
        doc.y = 100;

        doc.fillColor(ROJO).font("Helvetica-Bold").fontSize(15).text("ACTA DE VALIDACIÓN DE ACTIVOS FIJOS", x0, doc.y, { width: ancho, align: "center" });
        doc.moveDown(1);

        // Datos (B3:C6 del Excel)
        const datos = [
            ["Sucursal / Área:", [lev.sucursalNombre, lev.areaNombre].filter(Boolean).join(" / ")],
            ["Fecha:", fechaLarga(lev.fecha)],
            ["Responsable levantamiento:", lev.auditorNombre],
            ["Líder de área:", lev.liderNombre || "________________________"],
            ...(lev.responsableNombre ? [["Responsable de los activos:", lev.responsableNombre]] : [])
        ];
        datos.forEach(([e, v]) => {
            const y = doc.y;
            doc.font("Helvetica-Bold").fontSize(10).fillColor("#1c1917").text(e, x0, y, { width: 170 });
            doc.font("Helvetica").text(v || "", x0 + 175, y, { width: ancho - 175 });
            doc.moveDown(0.35);
        });
        doc.moveDown(0.8);

        const parrafo = (texto) => {
            doc.font("Helvetica").fontSize(10).fillColor("#1c1917").text(texto, x0, doc.y, { width: ancho, align: "justify", lineGap: 2 });
            doc.moveDown(0.8);
        };
        parrafo("Por medio de la presente acta se deja constancia de la validación física de los activos fijos asignados al área antes descrita, como resultado del proceso de inventario y verificación realizado por el departamento responsable de control de activos fijos.");
        parrafo("El líder del área confirma que los activos detallados en el levantamiento realizado fueron revisados físicamente y corresponden, según verificación efectuada, a los bienes ubicados dentro de su área de responsabilidad.");
        parrafo("Asimismo, se deja constancia de las siguientes observaciones encontradas durante el proceso:");

        // Observaciones
        const r = lev.resumen || {};
        const obs = [
            `Activos revisados: ${r.total || 0}. Encontrados: ${r.encontrados || 0}. No localizados: ${r.noEncontrados || 0}. Hallazgos (no registrados): ${r.hallazgos || 0}.`,
            ...(lev.observacionesGenerales ? [lev.observacionesGenerales] : []),
            ...(lev.lineas || []).filter((l) => l.observaciones).map((l) => `${l.codigo || l.descripcion}: ${l.observaciones}`),
            ...(lev.lineas || []).filter((l) => l.diferencias?.length).map((l) => `${l.codigo}: ${l.diferencias.join("; ")}${lev.aplicoDiferencias ? " (ajustado)" : ""}`)
        ];
        doc.font("Helvetica-Bold").fontSize(10).fillColor(ROJO).text("OBSERVACIONES", x0, doc.y);
        doc.moveDown(0.3);
        const yObs = doc.y;
        doc.font("Helvetica").fontSize(9).fillColor("#1c1917");
        obs.forEach((o) => doc.text(`•  ${o}`, x0 + 8, doc.y, { width: ancho - 16, lineGap: 1 }));
        doc.rect(x0, yObs - 4, ancho, Math.max(doc.y - yObs + 8, 60)).strokeColor(BORDE).stroke();
        doc.y = Math.max(doc.y, yObs + 56) + 14;

        parrafo(`Yo, ${lev.liderNombre || "____________________________________"}, en calidad de líder/responsable del área ${lev.areaNombre || lev.sucursalNombre || "____________________________________"}, confirmo que la información proporcionada durante el proceso de levantamiento e inventario de activos fijos fue revisada conjuntamente y que los activos encontrados, así como las observaciones registradas, reflejan razonablemente la situación actual del área a la fecha de firma de esta acta.`);
        parrafo("Entiendo además que cualquier diferencia posterior deberá ser reportada oportunamente al departamento correspondiente para su análisis y seguimiento.");

        // Firmas
        if (doc.y > doc.page.height - 190) doc.addPage();
        doc.moveDown(0.5);
        doc.font("Helvetica-Bold").fontSize(10).fillColor(ROJO).text("FIRMAS", x0, doc.y);
        doc.moveDown(2.2);
        const firmas = [
            [lev.liderNombre, "Líder de Área"],
            [responsableInventario || lev.auditorNombre, "Responsable Inventario"]
        ];
        const anchoFirma = (ancho - 40) / 2;
        const yF = doc.y;
        firmas.forEach(([nombre, cargo], i) => {
            const x = x0 + i * (anchoFirma + 40);
            doc.moveTo(x, yF).lineTo(x + anchoFirma, yF).strokeColor("#1c1917").stroke();
            doc.font("Helvetica-Bold").fontSize(9).fillColor("#1c1917").text(nombre || " ", x, yF + 5, { width: anchoFirma, align: "center" });
            doc.font("Helvetica").fillColor(GRIS).text(cargo, x, yF + 18, { width: anchoFirma, align: "center" });
        });
        doc.y = yF + 44;

        // Anexos: detalle de activos levantados
        doc.addPage();
        doc.font("Helvetica-Bold").fontSize(11).fillColor(ROJO).text("ANEXOS", x0, doc.y);
        doc.font("Helvetica").fontSize(9).fillColor(GRIS).text("Reporte de activos levantados · Detalle de diferencias u observaciones · Evidencia fotográfica (si aplica).", x0, doc.y + 2, { width: ancho });
        doc.moveDown(0.8);

        const encabezadoTabla = () => {
            let x = x0;
            const y = doc.y;
            doc.rect(x0, y, ancho, 18).fill("#1c0a0a");
            COLUMNAS.forEach((c) => {
                doc.fillColor("#ffffff").font("Helvetica-Bold").fontSize(7.5).text(c.titulo, x + 3, y + 5, { width: c.ancho - 6 });
                x += c.ancho;
            });
            doc.y = y + 18;
        };
        encabezadoTabla();
        (lev.lineas || []).forEach((l, i) => {
            doc.font("Helvetica").fontSize(7.5);
            const alto = Math.max(16, ...COLUMNAS.map((c) => doc.heightOfString(String(c.valor(l, i) || ""), { width: c.ancho - 6 }) + 8));
            if (doc.y + alto > doc.page.height - 56) {
                doc.addPage();
                encabezadoTabla();
            }
            const y = doc.y;
            if (!l.encontrado) doc.rect(x0, y, ancho, alto).fill("#fee2e2");
            else if (i % 2) doc.rect(x0, y, ancho, alto).fill("#f5f5f4");
            let x = x0;
            COLUMNAS.forEach((c) => {
                doc.fillColor("#1c1917").font("Helvetica").fontSize(7.5).text(String(c.valor(l, i) || ""), x + 3, y + 4, { width: c.ancho - 6 });
                x += c.ancho;
            });
            doc.moveTo(x0, y + alto).lineTo(x0 + ancho, y + alto).strokeColor(BORDE).lineWidth(0.5).stroke();
            doc.y = y + alto;
        });

        // Pie con número de página
        const rango = doc.bufferedPageRange();
        for (let i = 0; i < rango.count; i++) {
            doc.switchToPage(i);
            doc.page.margins.bottom = 0; // el pie no debe crear páginas nuevas
            doc.font("Helvetica").fontSize(8).fillColor("#a8a29e").text(
                `${lev.numero} · Página ${i + 1} de ${rango.count}`,
                x0, doc.page.height - 34, { width: ancho, align: "right", lineBreak: false }
            );
        }
        doc.end();
    });
