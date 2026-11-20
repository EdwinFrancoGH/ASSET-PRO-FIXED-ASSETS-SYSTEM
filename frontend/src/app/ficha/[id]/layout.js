// Ficha pública del activo (se abre al escanear la etiqueta QR).
// Está FUERA de (app) y (auth): no pide sesión ni da acceso al sistema.
export const metadata = {
    title: "Ficha del activo · ASSET PRO",
    description: "Ficha pública de un activo fijo de Electrolab Medic",
    robots: { index: false, follow: false }
};

export default function FichaLayout({ children }) {
    return children;
}
