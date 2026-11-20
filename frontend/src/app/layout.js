import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import "./globals.css";
import { AuthProvider } from "../context/AuthContext";

export const metadata = {
    title: "ASSET PRO - Fixed Assets",
    description: "Control de activos fijos: inventario, movimientos, levantamientos y actas"
};

// Aplica el modo claro antes de pintar la página (evita el "parpadeo" oscuro).
const scriptTema = `try{if(localStorage.getItem("assetpro-tema")==="claro"){document.documentElement.classList.add("tema-claro")}}catch(e){}`;

// Seguridad con los botones Atrás/Adelante: el navegador puede mostrar una
// "foto" guardada de la página (bfcache) sin volver a revisar la sesión. Si la
// página viene de esa caché, se recarga para que siempre se valide la sesión.
const scriptHistorial = `window.addEventListener("pageshow",function(e){if(e.persisted){window.location.reload()}});`;

export default function RootLayout({ children }) {
    return (
        <html lang="es" className={`${GeistSans.variable} ${GeistMono.variable} h-full antialiased`} suppressHydrationWarning>
            <head>
                <script dangerouslySetInnerHTML={{ __html: scriptTema }} />
                <script dangerouslySetInnerHTML={{ __html: scriptHistorial }} />
            </head>
            <body className="min-h-full">
                <AuthProvider>{children}</AuthProvider>
            </body>
        </html>
    );
}
