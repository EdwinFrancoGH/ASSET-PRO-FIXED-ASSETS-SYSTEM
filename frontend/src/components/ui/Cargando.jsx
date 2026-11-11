export default function Cargando({ texto = "Cargando...", oscuro = true }) {
    return (
        <div className={`flex items-center justify-center gap-3 py-16 ${oscuro ? "text-stone-300" : "text-stone-500"}`}>
            <div className="h-6 w-6 rounded-full border-4 border-brand-500 border-t-transparent animate-spin" />
            {texto}
        </div>
    );
}
