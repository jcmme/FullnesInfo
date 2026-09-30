import Link from "next/link";
import { AREA_LIST } from "@/lib/areas";

export type AreaProgress = { id: string; label: string; done: number; total: number };

/**
 * Tus áreas con su avance, y de paso el filtro de la pantalla. Componente de
 * servidor: no baja nada de JavaScript, y tocar un área es una navegación normal.
 */
export function AreaBoard({ areas, active }: { areas: AreaProgress[]; active: string | null }) {
  return (
    <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
      {areas.map((a) => {
        const on = a.id === active;
        const pct = a.total > 0 ? Math.round((a.done / a.total) * 100) : 0;
        return (
          <li key={a.id}>
            <Link
              href={on ? "/descubrir" : `/descubrir?area=${a.id}`}
              prefetch={false}
              aria-current={on ? "true" : undefined}
              className={`press flex h-full flex-col justify-between gap-2 rounded-card p-3 transition-colors ${
                on ? "bg-tint-soft ring-2 ring-tint" : "bg-surface"
              }`}
            >
              <span className="flex items-baseline justify-between gap-2">
                <span className="footnote font-semibold">{a.label}</span>
                <span className="caption text-ink-2 tabular">
                  {a.done}/{a.total}
                </span>
              </span>
              <span className="block h-1.5 overflow-hidden rounded-full bg-surface-2">
                <span
                  className={`block h-full rounded-full ${a.done > 0 ? "bg-tint" : ""}`}
                  style={{ width: `${pct}%` }}
                  aria-hidden
                />
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

/** El nombre de un área para el aviso de filtro activo. */
export const labelOfArea = (id: string) => AREA_LIST.find((a) => a.id === id)?.label ?? id;
