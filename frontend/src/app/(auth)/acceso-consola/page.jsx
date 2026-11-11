"use client";

// Acceso directo desde ASSET PRO CONSOLE.
// La consola genera un token de un solo uso (válido 1 hora) para un usuario
// EXISTENTE de esta app y abre esta página con el token en el fragmento (#t=...),
// que nunca viaja al servidor. Aquí se inicia sesión con ese token y se entra
// directo al sistema. No crea usuarios ni cambia el login normal.
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { signInWithCustomToken, signOut } from "firebase/auth";
import { auth } from "../../../lib/firebase";

export default function AccesoConsola() {
    const router = useRouter();
    const [error, setError] = useState("");

    useEffect(() => {
        const token = new URLSearchParams(window.location.hash.slice(1)).get("t");
        // Se borra el token de la barra de direcciones y del historial.
        window.history.replaceState(null, "", window.location.pathname);
        if (!token) { router.replace("/login"); return; }
        (async () => {
            try {
                if (auth.currentUser) await signOut(auth);
                await signInWithCustomToken(auth, token);
                router.replace("/dashboard");
            } catch {
                setError("El acceso directo expiró o no es válido. Genera uno nuevo desde la consola.");
            }
        })();
    }, [router]);

    return (
        <div className="space-y-4 text-center">
            {error ? (
                <>
                    <p className="rounded-xl border border-red-400/30 bg-red-500/15 p-3 text-sm text-red-200">{error}</p>
                    <button onClick={() => router.replace("/login")} className="text-sm underline opacity-80 hover:opacity-100">Ir al inicio de sesión</button>
                </>
            ) : (
                <p className="text-slate-200">Ingresando...</p>
            )}
        </div>
    );
}
