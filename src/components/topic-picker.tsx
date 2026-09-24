"use client";

import { CaretDown, Check, Plus, X } from "@phosphor-icons/react";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { saveInterests, type InterestInput } from "@/app/actions/topics";

export type PickerTopic = { id: string; title: string; hook: string; area: string };
export type PickerArea = { key: string; label: string; topics: PickerTopic[] };

/**
 * Elegir temas es local: tocas y se marca al momento, sin ir al servidor. Se guarda
 * una sola vez al final.
 */
export function TopicPicker({
  areas,
  initial,
}: {
  areas: PickerArea[];
  initial: InterestInput[];
}) {
  const router = useRouter();
  const [chosen, setChosen] = useState<Map<string, InterestInput>>(() => new Map(initial.map((i) => [i.key, i])));
  const [custom, setCustom] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const mine = useMemo(() => [...chosen.values()].filter((c) => c.key.startsWith("propio:")), [chosen]);

  const toggle = (item: InterestInput) => {
    setChosen((prev) => {
      const next = new Map(prev);
      if (next.has(item.key)) next.delete(item.key);
      else next.set(item.key, item);
      return next;
    });
  };

  const addCustom = () => {
    const label = custom.trim();
    if (!label) return;
    // Esto es una copia a propósito de customKey() de lib/topics.ts: importarlo de allá
    // arrastraría el paquete de fichas entero al JavaScript de tu teléfono.
    const key = `propio:${label
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60)}`;
    if (key === "propio:") return;
    setChosen((prev) => new Map(prev).set(key, { key, label, area: "propio" }));
    setCustom("");
  };

  const save = () =>
    start(async () => {
      setError(null);
      const res = await saveInterests([...chosen.values()]);
      if (res?.error) {
        setError(res.error);
        return;
      }
      router.push("/descubrir");
    });

  return (
    <div className="pb-32">
      <div className="mb-6">
        <label htmlFor="propio" className="label">
          Agrega el tuyo
        </label>
        <div className="flex gap-2">
          <input
            id="propio"
            value={custom}
            onChange={(e) => setCustom(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addCustom();
              }
            }}
            placeholder="Café de especialidad, arquitectura, ajedrez"
            className="field flex-1"
            maxLength={120}
          />
          <button type="button" onClick={addCustom} disabled={!custom.trim()} className="btn btn-secondary shrink-0">
            <Plus size={18} weight="bold" aria-hidden />
            Agregar
          </button>
        </div>
        {mine.length > 0 && (
          <ul className="mt-3 flex flex-wrap gap-2">
            {mine.map((c) => (
              <li key={c.key}>
                <button
                  type="button"
                  onClick={() => toggle(c)}
                  className="press chip min-h-11 gap-1.5 bg-tint text-on-tint"
                  aria-label={`Quitar ${c.label}`}
                >
                  {c.label}
                  <X size={14} weight="bold" aria-hidden />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="space-y-3">
        {areas.map((area) => {
          const count = area.topics.filter((t) => chosen.has(t.id)).length;
          return (
            <details key={area.key} className="group rounded-card bg-surface px-4">
              <summary className="press flex min-h-14 cursor-pointer list-none items-center justify-between gap-3 [&::-webkit-details-marker]:hidden">
                <span className="headline">{area.label}</span>
                <span className="flex items-center gap-2">
                  {count > 0 && <span className="chip bg-tint-soft text-tint-ink tabular">{count}</span>}
                  <CaretDown size={16} className="text-ink-3 transition-transform group-open:rotate-180" aria-hidden />
                </span>
              </summary>
              <ul className="space-y-2 pb-4 pt-1">
                {area.topics.map((t) => {
                  const selected = chosen.has(t.id);
                  return (
                    <li key={t.id}>
                      <button
                        type="button"
                        aria-pressed={selected}
                        onClick={() => toggle({ key: t.id, label: t.title, area: t.area })}
                        className={`press flex w-full items-start gap-3 rounded-control p-3 text-left transition-colors ${
                          selected ? "bg-tint-soft" : "bg-surface-2"
                        }`}
                      >
                        <span
                          aria-hidden
                          className={`mt-0.5 grid size-6 shrink-0 place-items-center rounded-full border-2 transition-colors ${
                            selected ? "border-tint bg-tint text-on-tint" : "border-line"
                          }`}
                        >
                          {selected && <Check size={14} weight="bold" />}
                        </span>
                        <span className="min-w-0">
                          <span className={`footnote block font-semibold ${selected ? "text-tint-ink" : ""}`}>{t.title}</span>
                          <span className="caption mt-0.5 block text-pretty text-ink-2">{t.hook}</span>
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </details>
          );
        })}
      </div>

      {error && (
        <p role="alert" className="mt-4 rounded-control bg-bad-soft px-4 py-3 footnote font-semibold text-bad">
          {error}
        </p>
      )}

      <div className="fixed inset-x-0 bottom-0 z-30 bg-linear-to-t from-bg via-bg/95 to-transparent px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-6 md:px-8">
        <div className="mx-auto max-w-2xl">
          <button type="button" onClick={save} disabled={pending} className="btn btn-primary btn-lg w-full">
            {pending ? "Guardando…" : chosen.size ? `Guardar ${chosen.size} ${chosen.size === 1 ? "tema" : "temas"}` : "Guardar"}
          </button>
        </div>
      </div>
    </div>
  );
}
