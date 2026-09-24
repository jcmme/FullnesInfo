"use client";

import Link from "next/link";

/** Si una pantalla truena, esto la reemplaza en vez de dejarte en blanco. */
export default function AppError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <div className="mx-auto max-w-md px-4 pt-16 text-center pt-safe">
      <h1 className="title-large">Algo se atoró</h1>
      <p className="footnote mt-2 text-pretty text-ink-2">
        No se pudo cargar esta pantalla. Lo que ya habías guardado está a salvo.
      </p>
      <button type="button" onClick={() => retry()} className="btn btn-primary btn-lg mt-6 w-full">
        Intentar otra vez
      </button>
      <Link href="/" className="btn btn-ghost mt-2">
        Ir a Hoy
      </Link>
      {error.digest && <p className="caption mt-8 text-ink-3">Clave del error: {error.digest}</p>}
    </div>
  );
}
