// Copia de calcularDepreciacion() del backend (vista previa en el formulario).
const r2 = (n) => Math.round(n * 100) / 100;

export const calcularDepreciacion = (activo, hoy = new Date()) => {
    const valor = Number(activo.valorCompra) || 0;
    const vida = Number(activo.vidaUtilAnios) || 0;
    if (!valor || !vida) return null;
    const mensual = valor / (vida * 12);
    let meses = 0;
    if (activo.fechaCompra) {
        const [a, m, d] = String(activo.fechaCompra).slice(0, 10).split("-").map(Number);
        meses = (hoy.getFullYear() - a) * 12 + (hoy.getMonth() + 1 - m) - (hoy.getDate() < d ? 1 : 0);
        meses = Math.max(0, Math.min(meses, vida * 12));
    }
    const acumulada = Math.min(valor, mensual * meses);
    return { depreciacionMensual: r2(mensual), mesesUso: meses, depreciacionAcumulada: r2(acumulada), valorLibros: r2(valor - acumulada), porcentajeDepreciado: r2((acumulada / valor) * 100) };
};
