"use client";

import { Check, Copy, Eye, EyeSlash } from "@phosphor-icons/react";
import { useActionState, useState, useTransition } from "react";
import { regenerateToken, updateSettings } from "@/app/actions/settings";

const TIMEZONES = [
  "America/Mexico_City",
  "America/Monterrey",
  "America/Cancun",
  "America/Chihuahua",
  "America/Hermosillo",
  "America/Tijuana",
  "America/Bogota",
  "America/Lima",
  "America/Santiago",
  "America/Argentina/Buenos_Aires",
  "America/New_York",
  "America/Los_Angeles",
  "Europe/Madrid",
];

export function RulesForm({ minWords, freezes, timezone }: { minWords: number; freezes: number; timezone: string }) {
  const [state, action, pending] = useActionState(updateSettings, undefined);
  const zones = TIMEZONES.includes(timezone) ? TIMEZONES : [timezone, ...TIMEZONES];
  return (
    <form action={action} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="min_words" className="label">
            Palabras mínimas por nota
          </label>
          <input id="min_words" name="min_words" type="number" min={10} max={500} defaultValue={minWords} className="field tabular" />
        </div>
        <div>
          <label htmlFor="freezes_per_month" className="label">
            Comodines por mes
          </label>
          <input
            id="freezes_per_month"
            name="freezes_per_month"
            type="number"
            min={0}
            max={5}
            defaultValue={freezes}
            className="field tabular"
          />
        </div>
      </div>
      <div>
        <label htmlFor="timezone" className="label">
          Zona horaria
        </label>
        <select id="timezone" name="timezone" defaultValue={timezone} className="field">
          {zones.map((z) => (
            <option key={z} value={z}>
              {z.replace(/_/g, " ").replace("America/", "")}
            </option>
          ))}
        </select>
      </div>
      <div className="flex items-center gap-3">
        <button type="submit" disabled={pending} className="btn btn-primary">
          {pending ? "Guardando…" : "Guardar reglas"}
        </button>
        {state?.ok && (
          <span className="footnote flex items-center gap-1 text-ok">
            <Check size={16} weight="bold" aria-hidden /> Guardado
          </span>
        )}
        {state?.error && <span className="footnote text-bad">{state.error}</span>}
      </div>
    </form>
  );
}

function CopyButton({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        } catch {
          window.prompt("Copia manualmente:", value);
        }
      }}
      className="btn btn-secondary min-h-10 px-3 footnote"
    >
      {copied ? <Check size={16} weight="bold" aria-hidden /> : <Copy size={16} aria-hidden />}
      {copied ? "Copiado" : label}
    </button>
  );
}

export function TokenPanel({ token: initial, origin }: { token: string; origin: string }) {
  const [token, setToken] = useState(initial);
  const [visible, setVisible] = useState(false);
  const [pending, start] = useTransition();
  return (
    <div className="space-y-4">
      <div>
        <p className="label">Tu token personal</p>
        <div className="flex flex-wrap items-center gap-2">
          <code className="field flex min-w-0 flex-1 items-center truncate font-mono text-[0.8125rem] tabular">
            {visible ? token : `${token.slice(0, 6)}${"•".repeat(20)}`}
          </code>
          <button
            type="button"
            onClick={() => setVisible((v) => !v)}
            aria-label={visible ? "Ocultar token" : "Mostrar token"}
            className="btn btn-secondary min-h-10 px-3"
          >
            {visible ? <EyeSlash size={18} aria-hidden /> : <Eye size={18} aria-hidden />}
          </button>
          <CopyButton value={token} label="Copiar" />
        </div>
        <p className="caption mt-1.5 text-ink-2">Es como una contraseña: quien lo tenga puede guardar en tu biblioteca.</p>
      </div>
      <div className="flex flex-wrap gap-2">
        <CopyButton value={`${origin}/api/capture`} label="URL para guardar" />
        <CopyButton value={`${origin}/api/status`} label="URL de estado" />
        <button
          type="button"
          disabled={pending}
          onClick={() => {
            if (!window.confirm("¿Generar un token nuevo? Tus Atajos actuales dejarán de funcionar hasta que pegues el nuevo.")) return;
            start(async () => {
              const res = await regenerateToken();
              setToken(res.token);
              setVisible(true);
            });
          }}
          className="btn btn-ghost min-h-10 px-3 footnote text-bad hover:bg-bad-soft"
        >
          Generar token nuevo
        </button>
      </div>
    </div>
  );
}
