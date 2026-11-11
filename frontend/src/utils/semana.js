// Utilidades de fechas "AAAA-MM-DD" para la programación semanal (semana de lunes a domingo).
const aFecha = (iso) => {
    const [a, m, d] = String(iso).slice(0, 10).split("-").map(Number);
    return new Date(a, m - 1, d);
};
const aISO = (f) => `${f.getFullYear()}-${String(f.getMonth() + 1).padStart(2, "0")}-${String(f.getDate()).padStart(2, "0")}`;

export const sumarDias = (iso, dias) => {
    const f = aFecha(iso);
    f.setDate(f.getDate() + dias);
    return aISO(f);
};

// Lunes de la semana que contiene la fecha.
export const lunesDe = (iso) => {
    const f = aFecha(iso);
    const dia = (f.getDay() + 6) % 7; // 0 = lunes
    f.setDate(f.getDate() - dia);
    return aISO(f);
};

export const diasDeSemana = (lunes) => Array.from({ length: 7 }, (_, i) => sumarDias(lunes, i));

export const nombreDia = (iso, largo = true) =>
    aFecha(iso).toLocaleDateString("es-SV", { weekday: largo ? "long" : "short" });

export const diaMes = (iso) => aFecha(iso).toLocaleDateString("es-SV", { day: "numeric", month: "short" });

export const rangoSemana = (lunes) => {
    const dom = sumarDias(lunes, 6);
    const op = { day: "numeric", month: "long" };
    return `${aFecha(lunes).toLocaleDateString("es-SV", op)} – ${aFecha(dom).toLocaleDateString("es-SV", { ...op, year: "numeric" })}`;
};

export const horario = (v) => (v.horaInicio ? `${v.horaInicio}${v.horaFin ? ` – ${v.horaFin}` : ""}` : "Todo el día");
