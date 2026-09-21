"use client";

import { ArrowCounterClockwise, CheckCircle, Pause, Play, Timer } from "@phosphor-icons/react";
import { motion, useReducedMotion } from "motion/react";
import { useEffect, useOptimistic, useState, useTransition } from "react";
import { logPunishment, startPunishment, undoLastLog } from "@/app/actions/punishments";
import type { Challenge, PlanSuggestion } from "@/lib/challenges";
import { formatNumber, formatRemaining } from "@/lib/format";
import type { Punishment, PunishmentLog } from "@/lib/types";
import { ProgressBar } from "./media";

function useNow(intervalMs = 1000) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    const tick = () => setNow(Date.now());
    tick();
    const id = setInterval(tick, intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}

function clock(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

const unitWord = (unit: Punishment["unit"], n: number) =>
  unit === "km" ? "km" : unit === "seg" ? "s" : n === 1 ? "repetición" : "repeticiones";

export function StartPanel({ punishment, plans }: { punishment: Punishment; plans: PlanSuggestion[] }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const now = useNow(30_000);
  const left = now ? new Date(punishment.start_by).getTime() - now : null;

  return (
    <section className="card p-5">
      <h2 className="title-2">Cuando estés listo</h2>
      <p className="footnote mt-1 text-ink-2 text-pretty">
        Al empezar corre una ventana de {formatNumber(Number(punishment.window_hours))} h para completarlo.
        {left !== null && ` Tienes ${formatRemaining(left)} para empezar; si no, sube de nivel.`}
      </p>
      {plans.length > 0 && (
        <ul className="mt-4 space-y-2">
          {plans.map((p) => (
            <li key={p.label} className="rounded-control bg-surface-2 px-4 py-3">
              <p className="footnote font-semibold">{p.label}</p>
              <p className="footnote text-ink-2">{p.detail}</p>
            </li>
          ))}
        </ul>
      )}
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          start(async () => {
            const res = await startPunishment(punishment.id);
            if (res?.error) setError(res.error);
          })
        }
        className="btn btn-danger btn-lg mt-5 w-full"
      >
        <Timer size={20} aria-hidden />
        {pending ? "Arrancando…" : "Empezar ahora"}
      </button>
      {error && <p className="footnote mt-2 text-bad">{error}</p>}
    </section>
  );
}

type Optimistic = { progress: number; logs: PunishmentLog[] };

export function ActiveSession({
  punishment,
  logs,
  challenge,
  bestSet,
  timezone,
}: {
  punishment: Punishment;
  logs: PunishmentLog[];
  challenge: Challenge;
  bestSet: number;
  timezone: string;
}) {
  const reduce = useReducedMotion();
  const now = useNow(1000);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [custom, setCustom] = useState("");
  const [state, addOptimistic] = useOptimistic<Optimistic, number>(
    { progress: Number(punishment.progress), logs },
    (s, amount) => ({
      progress: Math.max(0, s.progress + amount),
      logs: amount > 0 ? [{ id: `tmp-${s.logs.length}`, punishment_id: punishment.id, amount, created_at: new Date().toISOString() }, ...s.logs] : s.logs.slice(1),
    }),
  );

  // Cronómetro para plancha: mide la serie y la registra al detenerlo.
  const [watchStart, setWatchStart] = useState<number | null>(null);

  const target = Number(punishment.target);
  const remaining = Math.max(0, target - state.progress);
  const due = punishment.due_at ? new Date(punishment.due_at).getTime() : null;
  const msLeft = due && now ? due - now : null;
  const done = state.progress >= target;
  const isKm = punishment.unit === "km";
  const isSeconds = punishment.unit === "seg";
  const setSize = challenge.setSize ?? 10;

  const log = (amount: number) => {
    if (!amount || amount <= 0) return;
    setError(null);
    start(async () => {
      addOptimistic(amount);
      const res = await logPunishment(punishment.id, amount);
      if (res && "error" in res && res.error) setError(res.error);
    });
  };

  const undo = () => {
    setError(null);
    start(async () => {
      addOptimistic(-(state.logs[0]?.amount ?? 0));
      const res = await undoLastLog(punishment.id);
      if (res && "error" in res && res.error) setError(res.error);
    });
  };

  // Ritmo necesario con lo que queda de tiempo.
  let pace: string | null = null;
  if (!done && msLeft && msLeft > 0) {
    if (isKm) {
      const daysLeft = Math.max(1, Math.ceil(msLeft / 86_400_000));
      pace = `Te faltan ${formatNumber(remaining, 1)} km: ${formatNumber(remaining / daysLeft, 1)} km por día.`;
    } else {
      const sets = Math.ceil(remaining / setSize);
      const every = Math.floor(msLeft / 60000 / Math.max(1, sets));
      pace =
        every >= 1
          ? `Te faltan ${formatNumber(remaining)} ${unitWord(punishment.unit, remaining)}: ${sets} ${sets === 1 ? "serie" : "series"} de ${setSize}${isSeconds ? " s" : ""}, una cada ${every} min.`
          : `Te faltan ${formatNumber(remaining)}. Ya no hay margen: hazlas seguidas.`;
    }
  }

  const quick = isKm ? [1, 2, 3, 5] : isSeconds ? [30, 45, 60] : [5, 10, setSize, 20].filter((v, i, a) => a.indexOf(v) === i).sort((a, b) => a - b);

  return (
    <section className="card p-5 md:p-6">
      <div className="flex items-baseline justify-between gap-3">
        <p className="caption font-semibold text-ink-2">{done ? "Cumplido" : "En curso"}</p>
        {msLeft !== null && !done && (
          <p className={`caption flex items-center gap-1 font-semibold tabular ${msLeft < 3_600_000 ? "text-bad" : "text-ink-2"}`}>
            <Timer size={14} aria-hidden />
            {isKm ? `Quedan ${formatRemaining(msLeft)}` : clock(msLeft)}
          </p>
        )}
      </div>

      <div className="mt-3 flex items-end gap-2">
        <motion.span
          key={state.progress}
          initial={reduce ? false : { y: 6, opacity: 0.4 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ type: "spring", bounce: 0, duration: 0.3 }}
          className={`numeral text-[4.5rem] ${done ? "text-ok" : ""}`}
        >
          {formatNumber(state.progress, 1)}
        </motion.span>
        <span className="title-2 mb-2 text-ink-2 tabular">
          / {formatNumber(target, 1)} {isKm ? "km" : isSeconds ? "s" : ""}
        </span>
      </div>
      <div className="mt-3">
        <ProgressBar value={state.progress / target} tone={done ? "ok" : "bad"} label="Avance del castigo" />
      </div>
      {pace && <p className="footnote mt-3 text-ink-2 text-pretty">{pace}</p>}

      {done ? (
        <p className="mt-5 flex items-center gap-2 rounded-control bg-ok-soft px-4 py-3 headline text-ok">
          <CheckCircle size={22} weight="fill" aria-hidden />
          Castigo pagado. La deuda quedó saldada.
        </p>
      ) : (
        <>
          {isSeconds && (
            <button
              type="button"
              onClick={() => {
                if (watchStart === null) {
                  setWatchStart(Date.now());
                } else {
                  const secs = Math.round((Date.now() - watchStart) / 1000);
                  setWatchStart(null);
                  log(secs);
                }
              }}
              className={`btn btn-lg mt-5 w-full ${watchStart === null ? "btn-secondary" : "btn-danger"}`}
            >
              {watchStart === null ? <Play size={20} weight="fill" aria-hidden /> : <Pause size={20} weight="fill" aria-hidden />}
              {watchStart === null ? "Iniciar serie" : `Detener y registrar ${now ? Math.max(0, Math.round((now - watchStart) / 1000)) : 0} s`}
            </button>
          )}

          <p className="label mt-5">Registrar {isKm ? "kilómetros" : isSeconds ? "segundos" : "serie"}</p>
          <div className="grid grid-cols-4 gap-2">
            {quick.map((q) => (
              <button key={q} type="button" onClick={() => log(q)} className="btn btn-secondary tabular px-0">
                +{q}
              </button>
            ))}
          </div>
          <form
            className="mt-2 flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              log(Number(custom.replace(",", ".")));
              setCustom("");
            }}
          >
            <label className="flex-1">
              <span className="sr-only">Otra cantidad</span>
              <input
                value={custom}
                onChange={(e) => setCustom(e.target.value)}
                inputMode={isKm ? "decimal" : "numeric"}
                placeholder={isKm ? "Otra distancia, ej. 2.4" : "Otra cantidad"}
                className="field tabular"
              />
            </label>
            <button type="submit" disabled={!custom.trim()} className="btn btn-primary">
              Sumar
            </button>
          </form>
        </>
      )}

      {error && <p className="footnote mt-3 text-bad">{error}</p>}

      {state.logs.length > 0 && (
        <div className="mt-6 border-t hairline pt-4">
          <div className="flex items-center justify-between gap-3">
            <p className="headline">Registro</p>
            <button type="button" onClick={undo} disabled={pending} className="btn btn-ghost min-h-9 px-2 footnote">
              <ArrowCounterClockwise size={16} aria-hidden />
              Deshacer última
            </button>
          </div>
          {!isKm && bestSet > 0 && (
            <p className="caption mt-1 text-ink-2">
              Mejor serie en tus castigos de {challenge.name.toLowerCase()}: {formatNumber(bestSet)}
              {isSeconds ? " s" : ""}. Cada castigo es una oportunidad de superarla.
            </p>
          )}
          <ol className="mt-2 divide-y hairline">
            {state.logs.map((l, i) => (
              <li key={l.id} className="flex items-baseline justify-between py-2 footnote">
                <span className="text-ink-2">
                  {isKm ? "Salida" : "Serie"} {state.logs.length - i}
                </span>
                <span className="tabular">
                  <span className="font-semibold">
                    {formatNumber(Number(l.amount), 1)}
                    {isKm ? " km" : isSeconds ? " s" : ""}
                  </span>
                  {now !== null && (
                    <span className="ml-3 text-ink-3">
                      {new Date(l.created_at).toLocaleTimeString("es-MX", { hour: "numeric", minute: "2-digit", timeZone: timezone })}
                    </span>
                  )}
                </span>
              </li>
            ))}
          </ol>
        </div>
      )}
    </section>
  );
}
