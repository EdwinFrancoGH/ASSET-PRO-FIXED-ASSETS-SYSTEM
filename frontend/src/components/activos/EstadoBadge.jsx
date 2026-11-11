import { INFO_ESTADO, INFO_CONDICION } from "../../utils/activos";

export default function EstadoBadge({ estado }) {
    const info = INFO_ESTADO[estado] || { etiqueta: estado, clase: "bg-white/10 text-stone-200 ring-white/20" };
    return (
        <span className={`inline-flex items-center whitespace-nowrap rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset ${info.clase}`}>
            {info.etiqueta}
        </span>
    );
}

export function CondicionTexto({ condicion }) {
    const info = INFO_CONDICION[condicion];
    if (!info) return <span className="text-stone-400">—</span>;
    return <span className={`font-medium ${info.clase}`}>● {info.etiqueta}</span>;
}
