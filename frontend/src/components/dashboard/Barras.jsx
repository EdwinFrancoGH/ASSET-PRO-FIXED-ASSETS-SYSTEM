// Barras horizontales simples (cantidad de activos por grupo).
export default function Barras({ datos, vacio = "Sin datos.", max = 8 }) {
    if (!datos?.length) return <p className="text-stone-400">{vacio}</p>;
    const visibles = datos.slice(0, max);
    const tope = Math.max(...visibles.map((d) => d.cantidad), 1);
    return (
        <ul className="space-y-3">
            {visibles.map((d) => (
                <li key={d.nombre}>
                    <div className="mb-1 flex items-baseline justify-between gap-3 text-sm">
                        <span className="truncate text-stone-200">{d.nombre}</span>
                        <span className="flex-none font-semibold text-white">{d.cantidad}</span>
                    </div>
                    <div className="h-2 rounded-full bg-white/10">
                        <div className="h-full rounded-full bg-gradient-to-r from-brand-700 to-brand-400" style={{ width: `${(d.cantidad / tope) * 100}%` }} />
                    </div>
                </li>
            ))}
            {datos.length > max && <li className="text-xs text-stone-400">y {datos.length - max} más…</li>}
        </ul>
    );
}
