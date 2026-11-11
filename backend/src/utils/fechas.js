// Fecha de hoy (AAAA-MM-DD) en la zona horaria de la empresa, no en UTC:
// en El Salvador (UTC-6) después de las 6 p. m. UTC ya es "mañana".
const ZONA = process.env.ZONA_HORARIA || "America/El_Salvador";

export const hoyISO = () => new Intl.DateTimeFormat("en-CA", { timeZone: ZONA, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
