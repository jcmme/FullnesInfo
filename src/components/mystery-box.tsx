"use client";

import { Clock, Lock, MagnifyingGlass, PencilSimple } from "@phosphor-icons/react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import Link from "next/link";
import { useState, useTransition } from "react";
import { createItem } from "@/app/actions/items";
import { openMysteryBox } from "@/app/actions/mystery";
import { AREAS, RARITY_LABEL } from "@/lib/mystery";
import type { MediaResult, MysteryOpen, MysteryTopic, Rarity } from "@/lib/types";
import { MediaSearch } from "./media-search";

const RARITY_STYLE: Record<Rarity, { chip: string; wash: string; ring: string }> = {
  comun: { chip: "bg-surface-2 text-ink-2", wash: "bg-surface-2", ring: "" },
  rara: { chip: "bg-rare/15 text-rare", wash: "bg-rare/15", ring: "ring-1 ring-rare/40" },
  legendaria: { chip: "bg-legend/15 text-legend", wash: "bg-legend/20", ring: "ring-1 ring-legend/50" },
};

/** La caja: cuerpo, tapa y moño hechos con capas para poder animar la tapa por separado. */
function Box({ shaking, locked }: { shaking: boolean; locked: boolean }) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={`relative mx-auto h-56 w-60 ${locked ? "grayscale" : ""}`}
      animate={shaking && !reduce ? { rotate: [0, -4, 4, -3, 3, 0] } : { rotate: 0 }}
      transition={shaking ? { duration: 0.55, repeat: Infinity, ease: "easeInOut" } : { type: "spring", bounce: 0, duration: 0.3 }}
      exit={reduce ? { opacity: 0 } : { opacity: 0, y: 24, scale: 0.9, transition: { duration: 0.35, delay: 0.15, ease: [0.16, 1, 0.3, 1] } }}
    >
      <div className="absolute inset-x-8 bottom-0 h-5 rounded-[50%] bg-ink/15 blur-md" />
      <div className="absolute inset-x-5 bottom-3 top-[5.5rem] overflow-hidden rounded-[22px] bg-tint shadow-lift">
        <div className="absolute inset-y-0 left-1/2 w-8 -translate-x-1/2 bg-on-tint/85" />
        <div className="absolute inset-x-0 top-0 h-3 bg-ink/10" />
      </div>
      <motion.div
        className="absolute inset-x-2 top-14 h-12 rounded-[16px] shadow-card"
        style={{ background: "color-mix(in oklab, var(--tint) 82%, white)" }}
        exit={reduce ? { opacity: 0 } : { y: -150, x: 40, rotate: 28, opacity: 0, transition: { type: "spring", bounce: 0.2, duration: 0.7 } }}
      >
        <div className="absolute inset-y-0 left-1/2 w-8 -translate-x-1/2 bg-on-tint/90" />
        <div className="absolute -top-9 left-1/2 flex -translate-x-1/2 gap-1">
          <span className="block h-10 w-12 rotate-[-28deg] rounded-[50%] border-[7px] border-on-tint/90" />
          <span className="block h-10 w-12 rotate-[28deg] rounded-[50%] border-[7px] border-on-tint/90" />
        </div>
      </motion.div>
      {locked && (
        <span className="absolute left-1/2 top-[8.25rem] grid size-12 -translate-x-1/2 place-items-center rounded-full bg-surface text-ink shadow-card">
          <Lock size={24} weight="bold" aria-hidden />
        </span>
      )}
    </motion.div>
  );
}

function TopicCard({ topic, open, animate }: { topic: MysteryTopic; open: MysteryOpen; animate: boolean }) {
  const reduce = useReducedMotion();
  const [searching, setSearching] = useState(false);
  const [saving, start] = useTransition();
  const style = RARITY_STYLE[topic.rarity];

  const save = (r: MediaResult) => {
    const fd = new FormData();
    fd.set("title", topic.title);
    fd.set("kind", r.provider === "openlibrary" ? "libro" : r.provider === "itunes" ? "podcast" : "video");
    fd.set("note", `Caja misteriosa: ${topic.hook}`);
    fd.set("media", JSON.stringify(r));
    start(async () => {
      await createItem(undefined, fd);
    });
  };

  return (
    <motion.div
      className="relative"
      initial={animate ? (reduce ? { opacity: 0 } : { opacity: 0, y: 70, scale: 0.9, filter: "blur(10px)" }) : false}
      animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)", transitionEnd: { filter: "none" } }}
      transition={reduce ? { duration: 0.25 } : { type: "spring", bounce: 0.18, duration: 0.8, delay: 0.25 }}
    >
      {animate && !reduce && (
        <motion.div
          aria-hidden
          className={`absolute -inset-6 -z-10 rounded-[2rem] ${style.wash}`}
          initial={{ clipPath: "circle(0% at 50% 60%)", opacity: 1 }}
          animate={{ clipPath: "circle(75% at 50% 50%)", opacity: 0 }}
          transition={{
            clipPath: { duration: 0.9, ease: [0.16, 1, 0.3, 1], delay: 0.1 },
            opacity: { duration: 0.6, ease: "easeOut", delay: 1.1 },
          }}
        />
      )}
      <article className={`card p-6 md:p-8 ${style.ring}`}>
        <h2 className="title-1 text-balance">{topic.title}</h2>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <span className={`chip ${style.chip}`}>{RARITY_LABEL[topic.rarity]}</span>
          <span className="caption text-ink-2">{AREAS[topic.area] ?? topic.area}</span>
          <span className="caption flex items-center gap-1 text-ink-2">
            <Clock size={14} aria-hidden /> {topic.minutes} min
          </span>
        </div>
        <p className="mt-4 text-[1.1875rem] leading-snug font-medium text-pretty">{topic.hook}</p>
        <p className="footnote mt-3 max-w-[60ch] text-ink-2 text-pretty">{topic.why}</p>

        <h3 className="headline mt-6">Preguntas para guiarte</h3>
        <ol className="mt-2 list-decimal space-y-1.5 pl-5 footnote marker:font-semibold marker:text-ink-3">
          {topic.questions.map((q) => (
            <li key={q} className="pl-1 text-pretty">
              {q}
            </li>
          ))}
        </ol>

        <div className="mt-6 flex flex-wrap gap-2">
          <button type="button" onClick={() => setSearching((s) => !s)} className="btn btn-secondary">
            <MagnifyingGlass size={18} aria-hidden />
            {searching ? "Ocultar búsqueda" : "Buscar videos"}
          </button>
          <Link href={`/registrar?mystery=${open.id}`} className="btn btn-primary">
            <PencilSimple size={18} aria-hidden />
            {open.status === "investigada" ? "Agregar otra nota" : "Registrar lo que aprendí"}
          </Link>
        </div>

        {searching && (
          <div className="mt-5 border-t hairline pt-5">
            <p className="footnote mb-3 text-ink-2">Toca un resultado para guardarlo en tu biblioteca y verlo ahí.</p>
            {saving ? (
              <p className="footnote text-ink-2">Guardando…</p>
            ) : (
              <MediaSearch
                initialQuery={topic.searchQuery}
                sourceQueries={{ libro: topic.title, podcast: topic.title }}
                autoSearch
                onPick={save}
              />
            )}
          </div>
        )}
      </article>
    </motion.div>
  );
}

export function MysteryBox({
  initialOpen,
  initialTopic,
  locked,
  cutoffLabel,
}: {
  initialOpen: MysteryOpen | null;
  initialTopic: MysteryTopic | null;
  locked: boolean;
  cutoffLabel: string;
}) {
  const [open, setOpen] = useState<MysteryOpen | null>(initialOpen);
  const [topic, setTopic] = useState<MysteryTopic | null>(initialTopic);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [justOpened, setJustOpened] = useState(false);

  const handleOpen = () => {
    setError(null);
    start(async () => {
      const res = await openMysteryBox();
      if ("error" in res && res.error) setError(res.error);
      else if ("open" in res && res.open && res.topic) {
        setJustOpened(true);
        setTopic(res.topic);
        setOpen(res.open as MysteryOpen);
      }
    });
  };

  return (
    <div className="relative">
      <AnimatePresence mode="wait">
        {!open || !topic ? (
          <motion.div key="box" className="py-6 text-center" exit={{ opacity: 1 }}>
            <Box shaking={pending} locked={locked} />
            <motion.div className="mt-8" exit={{ opacity: 0, transition: { duration: 0.15 } }}>
              {locked ? (
                <>
                  <p className="headline">La caja está bloqueada</p>
                  <p className="footnote mx-auto mt-1 max-w-[34ch] text-ink-2">
                    Tienes días fallados sin castigo. Gira la ruleta y la caja se abre.
                  </p>
                  <Link href="/castigos" className="btn btn-primary btn-lg mt-5">
                    Ir a la ruleta
                  </Link>
                </>
              ) : (
                <>
                  <p className="headline">Un tema nuevo cada día</p>
                  <p className="footnote mx-auto mt-1 max-w-[36ch] text-ink-2">
                    Algo que vale la pena entender. Investígalo, escribe lo que aprendiste y cuenta como tu registro del día.
                  </p>
                  <button type="button" onClick={handleOpen} disabled={pending} className="btn btn-primary btn-lg mt-5 min-w-44">
                    {pending ? "Abriendo…" : "Abrir la caja"}
                  </button>
                  {error && <p className="footnote mt-3 text-bad">{error}</p>}
                </>
              )}
            </motion.div>
          </motion.div>
        ) : (
          <motion.div key="topic" initial={false}>
            <TopicCard topic={topic} open={open} animate={justOpened} />
            <p className="caption mt-4 text-center text-ink-2">Mañana después de las {cutoffLabel} hay otra caja.</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
