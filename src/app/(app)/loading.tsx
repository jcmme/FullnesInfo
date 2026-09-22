/** Esqueleto mientras llega la pantalla: el toque en una pestaña responde al instante. */
export default function Loading() {
  return (
    <div aria-busy="true" aria-label="Cargando" className="pt-safe">
      <div className="px-4 pb-4 pt-6 md:px-8 md:pt-10">
        <div className="h-9 w-48 rounded-control bg-surface-2 motion-safe:animate-pulse" />
        <div className="mt-2.5 h-4 w-32 rounded bg-surface-2 motion-safe:animate-pulse" />
      </div>
      <div className="space-y-3 px-4 md:px-8">
        <div className="card h-40 motion-safe:animate-pulse" />
        <div className="card h-24 motion-safe:animate-pulse" />
        <div className="card h-24 motion-safe:animate-pulse" />
      </div>
    </div>
  );
}
