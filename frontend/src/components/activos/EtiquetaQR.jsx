"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { FaPrint } from "react-icons/fa";
import Modal from "../ui/Modal";
import { botonPrimario, botonSecundario } from "../ui/estilos";

// Etiqueta con código QR (columna QRCode del Excel). El QR abre la ficha
// PÚBLICA del activo (/ficha/:id): no pide sesión ni da acceso al sistema.
export default function EtiquetaQR({ abierto, activo, onCerrar }) {
    const [qr, setQr] = useState("");

    useEffect(() => {
        if (!abierto || !activo) return;
        const url = `${window.location.origin}/ficha/${activo.id}`;
        QRCode.toDataURL(url, { margin: 1, width: 360, color: { dark: "#1c0a0a", light: "#ffffff" } }).then(setQr).catch(() => setQr(""));
    }, [abierto, activo]);

    if (!activo) return null;

    const imprimir = () => {
        const v = window.open("", "_blank", "width=480,height=420");
        if (!v) return;
        v.document.write(`<!doctype html><html><head><title>${activo.codigo}</title><style>
            @page{size:62mm 40mm;margin:0}body{margin:0;font-family:Arial,sans-serif}
            .e{width:62mm;height:40mm;display:flex;align-items:center;gap:3mm;padding:2.5mm;box-sizing:border-box}
            img{width:33mm;height:33mm}.t{font-size:7pt;line-height:1.25}.c{font-size:12pt;font-weight:bold}.m{color:#991b1b;font-weight:bold;font-size:6.5pt;letter-spacing:.5px}
        </style></head><body><div class="e"><img src="${qr}"/><div class="t"><div class="m">ASSET PRO · ACTIVO FIJO</div><div class="c">${activo.codigo}</div><div>${activo.idActivo}</div><div>${(activo.tipoNombre || "").replace(/</g, "&lt;")}</div><div>S/N ${(activo.serie || "—").replace(/</g, "&lt;")}</div></div></div>
        <script>window.onload=()=>{window.print();setTimeout(()=>window.close(),300)}</script></body></html>`);
        v.document.close();
    };

    return (
        <Modal abierto={abierto} titulo="Etiqueta del activo" onCerrar={onCerrar}>
            <div className="mx-auto flex max-w-sm items-center gap-4 rounded-2xl bg-white p-4 text-stone-900">
                {qr ? <img src={qr} alt={`QR de ${activo.codigo}`} className="h-36 w-36" /> : <div className="h-36 w-36 animate-pulse rounded bg-stone-200" />}
                <div className="text-sm leading-snug">
                    <p className="text-[10px] font-bold tracking-wider text-red-800">ASSET PRO · ACTIVO FIJO</p>
                    <p className="text-xl font-bold">{activo.codigo}</p>
                    <p>{activo.idActivo}</p>
                    <p>{activo.tipoNombre}</p>
                    <p>S/N {activo.serie || "—"}</p>
                </div>
            </div>
            <p className="mt-3 text-center text-sm text-stone-400">Al escanearlo, cualquier persona ve la ficha pública del activo (solo lectura, sin iniciar sesión).</p>
            <div className="mt-5 flex justify-end gap-3">
                <button onClick={onCerrar} className={botonSecundario}>Cerrar</button>
                <button onClick={imprimir} disabled={!qr} className={botonPrimario}><span className="inline-flex items-center gap-2"><FaPrint /> Imprimir</span></button>
            </div>
        </Modal>
    );
}
