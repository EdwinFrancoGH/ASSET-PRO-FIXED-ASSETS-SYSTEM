// Logo de Electrolab Medic adaptado al estilo "vidrio nocturno" carmesí:
// emblema con las curvas rojas del logo original + nombre y lema en blanco.
export function EmblemaElectrolab({ className = "h-11 w-11" }) {
    return (
        <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
            <defs>
                <linearGradient id="elm-rojo" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#ef3b2c" />
                    <stop offset="100%" stopColor="#d42a1c" />
                </linearGradient>
                <linearGradient id="elm-carmesi" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#911e16" />
                    <stop offset="100%" stopColor="#c8102e" />
                </linearGradient>
                <clipPath id="elm-marco">
                    <rect x="2" y="2" width="60" height="60" rx="16" />
                </clipPath>
            </defs>
            <g clipPath="url(#elm-marco)">
                <rect x="2" y="2" width="60" height="60" fill="#1c0807" />
                {/* línea curva exterior */}
                <path d="M70 -2 C30 0 2 20 4 38 C6 56 30 66 70 66" fill="none" stroke="#ef3b2c" strokeWidth="2.2" />
                {/* curva roja grande */}
                <path d="M70 2 C36 4 12 20 12 37 C12 54 36 64 70 64 Z" fill="url(#elm-rojo)" />
                {/* lente carmesí que apunta a la izquierda */}
                <path d="M70 13 C46 15 20 23 9 33 C20 43 46 50 70 52 Z" fill="url(#elm-carmesi)" />
                {/* "E" */}
                <path d="M31 24 H45 V28.5 H36.5 V30.8 H44 V35 H36.5 V37.4 H45 V42 H31 Z" fill="#fff" />
            </g>
            <rect x="2" y="2" width="60" height="60" rx="16" fill="none" stroke="rgba(255,255,255,0.15)" />
        </svg>
    );
}

// Nombre y lema a la izquierda del emblema; en celular solo el emblema.
export default function LogoElectrolab({ className = "" }) {
    return (
        <div className={`flex items-center gap-3 ${className}`} role="img" aria-label="Electrolab Medic — Todo para el cuidado de su salud">
            <div className="hidden text-right leading-tight sm:block">
                <div className="text-lg font-extrabold tracking-tight text-white md:text-xl">
                    Electrolab <span className="text-brand-400">Medic</span>
                </div>
                <div className="text-[11px] font-medium text-stone-300 md:text-xs">Todo para el cuidado de su salud</div>
            </div>
            <EmblemaElectrolab className="h-10 w-10 flex-none md:h-11 md:w-11" />
        </div>
    );
}
