export default function EstadoLevantamiento({ estado }) {
    return (
        <span className={`inline-flex whitespace-nowrap rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset ${estado === "CERRADO" ? "bg-emerald-500/15 text-emerald-200 ring-emerald-400/30" : "bg-amber-500/15 text-amber-200 ring-amber-400/30"}`}>
            {estado === "CERRADO" ? "Cerrado" : "En proceso"}
        </span>
    );
}
