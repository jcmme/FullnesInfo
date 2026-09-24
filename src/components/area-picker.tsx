"use client";

import { Check } from "@phosphor-icons/react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { saveAreas } from "@/app/actions/topics";
import type { Area } from "@/lib/areas";

/**
 * Lo único que eliges. Cabe en una pantalla, sin scroll: tocas y se marca al
 * momento, y se guarda una sola vez al final.
 */
export function AreaPicker({ areas, counts, initial }: { areas: Area[]; counts: Record<string, number>; initial: string[] }) {
  const router = useRouter();
  const [chosen, setChosen] = useState<Set<string>>(() => new Set(initial));
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const toggle = (id: string) =>
    setChosen((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <div className="pb-28">
      <ul className="grid grid-cols-3 gap-2">
        {areas.map((a) => {
          const on = chosen.has(a.id);
          const pronto = !counts[a.id];
          return (
            <li key={a.id}>
              <button
                type="button"
                aria-pressed={on}
                onClick={() => toggle(a.id)}
                title={a.hint}
                className={`press flex min-h-[3.5rem] w-full flex-col items-center justify-center gap-0.5 rounded-card px-2 py-2 text-center transition-colors ${
                  on ? "bg-tint text-on-tint" : "bg-surface"
                }`}
              >
                <span className="flex items-center gap-1 footnote font-semibold leading-tight">
                  {on && <Check size={13} weight="bold" aria-hidden />}
                  {a.label}
                </span>
                {pronto && <span className={`caption leading-none ${on ? "opacity-75" : "text-ink-3"}`}>pronto</span>}
              </button>
            </li>
          );
        })}
      </ul>

      {error && (
        <p role="alert" className="mt-4 rounded-control bg-bad-soft px-4 py-3 footnote font-semibold text-bad">
          {error}
        </p>
      )}

      <div className="fixed inset-x-0 bottom-0 z-30 bg-linear-to-t from-bg via-bg/95 to-transparent px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-6 md:px-8">
        <div className="mx-auto max-w-2xl">
          <button
            type="button"
            disabled={pending || chosen.size === 0}
            onClick={() =>
              start(async () => {
                const res = await saveAreas([...chosen]);
                if (res?.error) return setError(res.error);
                router.push("/descubrir");
              })
            }
            className="btn btn-primary btn-lg w-full"
          >
            {pending ? "Guardando…" : chosen.size ? `Listo, ${chosen.size} ${chosen.size === 1 ? "área" : "áreas"}` : "Elige al menos una"}
          </button>
        </div>
      </div>
    </div>
  );
}
