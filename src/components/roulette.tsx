"use client";

import { Barbell, Snowflake } from "@phosphor-icons/react";
import { animate, motion, useMotionValue, useReducedMotion, useTransform, type AnimationPlaybackControls } from "motion/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { forgiveFailure, spinFailure } from "@/app/actions/punishments";
import { CHALLENGES, describeTarget, getChallenge } from "@/lib/challenges";
import type { Punishment } from "@/lib/types";

const SEG = 360 / CHALLENGES.length;
const R = 100;

function polar(angleDeg: number, radius: number) {
  const a = ((angleDeg - 90) * Math.PI) / 180;
  return [radius * Math.cos(a), radius * Math.sin(a)];
}

function segmentPath(i: number) {
  const start = i * SEG - SEG / 2;
  const end = start + SEG;
  const [x1, y1] = polar(start, R - 4);
  const [x2, y2] = polar(end, R - 4);
  return `M0 0 L${x1} ${y1} A${R - 4} ${R - 4} 0 0 1 ${x2} ${y2} Z`;
}

const mod = (n: number, m: number) => ((n % m) + m) % m;

/**
 * Ruleta de castigos. Se gira con el dedo (hereda la velocidad del gesto) o con
 * el botón. El servidor decide el castigo; la ruleta aterriza en él con un
 * resorte que conserva la velocidad que traía.
 */
export function Roulette({
  failureId,
  level,
  canForgive,
  remaining,
}: {
  failureId: string;
  level: number;
  canForgive: boolean;
  remaining: number;
}) {
  const router = useRouter();
  const reduce = useReducedMotion();
  const rotation = useMotionValue(0);
  const pointerKick = useTransform(rotation, (r) => {
    const phase = mod(r + SEG / 2, SEG);
    return phase < 7 ? -(7 - phase) * 3 : 0;
  });
  const wheelRef = useRef<SVGSVGElement>(null);
  const drag = useRef<{ startAngle: number; startRotation: number; history: { t: number; r: number }[] } | null>(null);
  const controls = useRef<AnimationPlaybackControls | null>(null);
  const [phase, setPhase] = useState<"idle" | "spinning" | "done">("idle");
  const [result, setResult] = useState<Punishment | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [forgiving, startForgive] = useTransition();

  function angleAt(e: React.PointerEvent) {
    const rect = wheelRef.current!.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    return (Math.atan2(e.clientY - cy, e.clientX - cx) * 180) / Math.PI;
  }

  async function spin(velocity: number) {
    if (phase !== "idle") return;
    setPhase("spinning");
    setError(null);
    const dir = velocity >= 0 ? 1 : -1;
    const speed = Math.max(Math.abs(velocity), 720);

    if (!reduce) {
      controls.current?.stop();
      const far = rotation.get() + dir * 360 * 20;
      controls.current = animate(rotation, far, { ease: "linear", duration: (360 * 20) / speed });
    }

    // Si algo sale mal la ruleta frena y vuelve a poder girarse: nunca se queda dando vueltas.
    const stall = (message: string) => {
      controls.current?.stop();
      controls.current = animate(rotation, rotation.get() + dir * 40, { type: "spring", bounce: 0, duration: 0.8 });
      setError(message);
      setPhase("idle");
    };

    let res: Awaited<ReturnType<typeof spinFailure>>;
    try {
      res = await spinFailure(failureId);
    } catch {
      stall("No se pudo conectar. Revisa tu internet e inténtalo otra vez.");
      return;
    }
    if ("error" in res || !res.punishment) {
      stall(("error" in res && res.error) || "No se pudo girar.");
      return;
    }

    const p = res.punishment;
    const index = Math.max(0, CHALLENGES.findIndex((c) => c.id === p.challenge_id));
    const jitter = (Math.random() - 0.5) * SEG * 0.6;
    const rest = mod(-(index * SEG) + jitter, 360);
    const current = rotation.get();
    const target =
      dir > 0 ? current + 720 + mod(rest - current, 360) : current - 720 - mod(current - rest, 360);

    controls.current?.stop();
    if (reduce) {
      rotation.set(target);
      setResult(p);
      setPhase("done");
      return;
    }
    controls.current = animate(rotation, target, {
      type: "spring",
      bounce: 0,
      duration: 3.4,
      velocity: rotation.getVelocity(),
      onComplete: () => {
        setResult(p);
        setPhase("done");
      },
    });
  }

  const onPointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    if (phase !== "idle") return;
    e.currentTarget.setPointerCapture(e.pointerId);
    controls.current?.stop();
    drag.current = { startAngle: angleAt(e), startRotation: rotation.get(), history: [{ t: e.timeStamp, r: rotation.get() }] };
  };

  const onPointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const d = drag.current;
    if (!d) return;
    let delta = angleAt(e) - d.startAngle;
    delta = mod(delta + 180, 360) - 180;
    const r = d.startRotation + delta;
    // Acumula vueltas completas sin saltos al cruzar ±180°.
    const last = d.history[d.history.length - 1].r;
    const unwrapped = last + (mod(r - last + 180, 360) - 180);
    rotation.set(unwrapped);
    d.history.push({ t: e.timeStamp, r: unwrapped });
    if (d.history.length > 6) d.history.shift();
  };

  const onPointerUp = (e: React.PointerEvent<SVGSVGElement>) => {
    const d = drag.current;
    drag.current = null;
    if (!d) return;
    const first = d.history[0];
    const last = d.history[d.history.length - 1];
    const dt = (last.t - first.t) / 1000;
    const velocity = dt > 0 ? (last.r - first.r) / dt : 0;
    if (Math.abs(velocity) > 250 && e.timeStamp - last.t < 80) void spin(velocity);
  };

  const landed = result ? getChallenge(result.challenge_id) : null;

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-[min(19rem,82vw)] md:w-80">
        <motion.div
          className="absolute left-1/2 top-[-0.9rem] z-10 -translate-x-1/2"
          style={{ rotate: pointerKick, transformOrigin: "50% 20%" }}
          aria-hidden
        >
          <svg width="30" height="38" viewBox="0 0 30 38">
            <path d="M15 37 L3 8 A13 13 0 1 1 27 8 Z" fill="var(--ink)" />
            <circle cx="15" cy="12" r="4.5" fill="var(--bg)" />
          </svg>
        </motion.div>

        <motion.svg
          ref={wheelRef}
          viewBox="-100 -100 200 200"
          className={`aspect-square w-full touch-none select-none drop-shadow-[0_18px_30px_oklch(0.2_0.02_265/0.25)] ${
            phase === "idle" ? "cursor-grab active:cursor-grabbing" : ""
          }`}
          style={{ rotate: rotation }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={() => (drag.current = null)}
          role="img"
          aria-label="Ruleta de castigos"
        >
          <circle r={R} style={{ fill: "var(--wheel-rim)" }} />
          <circle r={R - 4} style={{ fill: "var(--surface)" }} />
          {CHALLENGES.map((c, i) => {
            const isWinner = landed?.id === c.id && phase === "done";
            const even = i % 2 === 0;
            return (
              <g key={c.id}>
                <path
                  d={segmentPath(i)}
                  opacity={phase === "done" && !isWinner ? 0.35 : 1}
                  style={{
                    fill: isWinner ? "var(--bad)" : even ? "var(--tint)" : "var(--wheel-alt)",
                    transition: "opacity 300ms ease-out, fill 300ms ease-out",
                  }}
                />
                <g transform={`rotate(${i * SEG})`}>
                  <text
                    x={0}
                    y={-58}
                    transform={`rotate(${i * SEG > 180 ? 90 : -90} 0 -58)`}
                    textAnchor="middle"
                    dominantBaseline="central"
                    fontSize={c.name.length > 10 ? 8.5 : 10}
                    fontWeight={700}
                    style={{ fill: even || isWinner ? "var(--on-tint)" : "var(--ink)", fontFamily: "var(--font-sans)" }}
                  >
                    {c.name === "Fondos en silla" ? "Fondos" : c.name}
                  </text>
                </g>
              </g>
            );
          })}
          {CHALLENGES.map((_, i) => {
            const [x, y] = polar(i * SEG - SEG / 2, R - 4);
            return <circle key={i} cx={x} cy={y} r={2.6} fill="var(--surface)" />;
          })}
          <circle r={22} fill="var(--surface)" />
        </motion.svg>

        <div className="pointer-events-none absolute inset-0 grid place-items-center">
          <Barbell size={26} weight="bold" className="text-ink" aria-hidden />
        </div>
      </div>

      <div className="mt-8 w-full max-w-sm text-center" aria-live="polite">
        {phase === "done" && result && landed ? (
          <motion.div
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: "spring", bounce: 0, duration: 0.4 }}
            className="card p-5 text-left"
          >
            <p className="title-2 first-letter:uppercase">{describeTarget(landed, Number(result.target), result.level)}</p>
            <p className="footnote mt-1 font-semibold text-bad">Tu castigo, nivel {result.level}</p>
            <p className="footnote mt-1 text-ink-2">
              {result.kind === "dias"
                ? "Ya corre el plazo. Registra tus kilómetros conforme avances."
                : "Tienes 48 h para empezarlo. Cuando empieces, corre el reloj."}
            </p>
            <Link href={`/castigos/${result.id}`} className="btn btn-primary mt-4 w-full">
              Ver el castigo
            </Link>
            {remaining > 1 && (
              <button type="button" onClick={() => router.refresh()} className="btn btn-secondary mt-2 w-full">
                Girar la siguiente ({remaining - 1})
              </button>
            )}
          </motion.div>
        ) : (
          <>
            <p className="footnote text-ink-2">
              Nivel {level}
              {level > 1 ? ` (fallaste ${level} días seguidos)` : ""}. Gírala con el dedo o con el botón.
            </p>
            <button
              type="button"
              onClick={() => void spin(900)}
              disabled={phase !== "idle"}
              className="btn btn-danger btn-lg mt-4 w-full"
            >
              {phase === "spinning" ? "Girando…" : "Girar la ruleta"}
            </button>
            {canForgive && phase === "idle" && (
              <button
                type="button"
                disabled={forgiving}
                onClick={() => {
                  if (!window.confirm("¿Gastar un comodín en este día? No habrá castigo y no se puede deshacer.")) return;
                  startForgive(async () => {
                    try {
                      const res = await forgiveFailure(failureId);
                      if (res?.error) setError(res.error);
                      else router.refresh();
                    } catch {
                      setError("No se pudo conectar. Revisa tu internet e inténtalo otra vez.");
                    }
                  });
                }}
                className="btn btn-ghost mt-2"
              >
                <Snowflake size={18} aria-hidden />
                Usar comodín en este día
              </button>
            )}
            {error && <p className="footnote mt-3 text-bad">{error}</p>}
          </>
        )}
      </div>
    </div>
  );
}
