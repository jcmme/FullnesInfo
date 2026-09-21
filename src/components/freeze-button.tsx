"use client";

import { Snowflake } from "@phosphor-icons/react";
import { useState, useTransition } from "react";
import { freezeToday } from "@/app/actions/punishments";

export function FreezeTodayButton({ left }: { left: number }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (left <= 0) return null;
  return (
    <div>
      <button
        type="button"
        disabled={pending}
        className="btn btn-ghost min-h-11 px-3 footnote"
        onClick={() => {
          const ok = window.confirm(
            `¿Usar un comodín hoy? El día no contará como fallado. Te ${left === 1 ? "queda 1" : `quedan ${left}`} este mes y no se puede deshacer.`,
          );
          if (!ok) return;
          start(async () => {
            const res = await freezeToday();
            if (res?.error) setError(res.error);
          });
        }}
      >
        <Snowflake size={18} aria-hidden />
        Usar comodín
      </button>
      {error && <p className="caption mt-1 text-bad">{error}</p>}
    </div>
  );
}
