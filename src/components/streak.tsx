"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

/**
 * Número de racha. Cuando acabas de cumplir el día (?cumplido=1) el número
 * rueda del valor anterior al nuevo: el único festejo de la pantalla.
 */
export function StreakNumber({ value, celebrate }: { value: number; celebrate: boolean }) {
  const router = useRouter();
  const reduce = useReducedMotion();
  const [rolled, setRolled] = useState(false);
  const shown = celebrate && !rolled ? Math.max(0, value - 1) : value;

  useEffect(() => {
    if (!celebrate) return;
    const t = setTimeout(() => setRolled(true), 450);
    const clear = setTimeout(() => router.replace("/", { scroll: false }), 1600);
    return () => {
      clearTimeout(t);
      clearTimeout(clear);
    };
  }, [celebrate, router]);

  return (
    <span className="relative inline-flex h-[1em] overflow-hidden align-baseline" aria-live="polite">
      <AnimatePresence initial={false} mode="popLayout">
        <motion.span
          key={shown}
          className="numeral inline-block"
          initial={reduce ? { opacity: 0 } : { y: "100%", filter: "blur(4px)" }}
          animate={reduce ? { opacity: 1 } : { y: 0, filter: "blur(0px)" }}
          exit={reduce ? { opacity: 0 } : { y: "-100%", filter: "blur(4px)" }}
          transition={reduce ? { duration: 0.2 } : { type: "spring", bounce: 0.2, duration: 0.5 }}
        >
          {shown}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}
