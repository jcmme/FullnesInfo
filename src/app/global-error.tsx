"use client";

/**
 * Último recurso: si truena hasta el layout, esta pantalla reemplaza el documento
 * entero. No recibe los estilos de la app, así que los trae puestos.
 */
export default function GlobalError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <html lang="es">
      <body
        style={{
          margin: 0,
          minHeight: "100dvh",
          display: "grid",
          placeItems: "center",
          padding: "24px",
          background: "light-dark(#f2f2f7, #000)",
          color: "light-dark(#1c1c1e, #fff)",
          colorScheme: "light dark",
          fontFamily: "-apple-system, BlinkMacSystemFont, system-ui, sans-serif",
          textAlign: "center",
        }}
      >
        <main style={{ maxWidth: "24rem" }}>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 700, margin: 0 }}>Algo se atoró</h1>
          <p style={{ marginTop: "0.5rem", fontSize: "0.9375rem", opacity: 0.7 }}>
            La app no pudo arrancar. Lo que ya habías guardado está a salvo.
          </p>
          <button
            type="button"
            onClick={() => retry()}
            style={{
              marginTop: "1.5rem",
              width: "100%",
              minHeight: "50px",
              borderRadius: "999px",
              border: "none",
              background: "#e2562a",
              color: "#fff",
              fontSize: "1.0625rem",
              fontWeight: 600,
            }}
          >
            Intentar otra vez
          </button>
          {error.digest && <p style={{ marginTop: "2rem", fontSize: "0.75rem", opacity: 0.5 }}>Clave del error: {error.digest}</p>}
        </main>
      </body>
    </html>
  );
}
