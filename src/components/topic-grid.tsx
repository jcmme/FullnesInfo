import Link from "next/link";
import { ArrowRight, CheckCircle } from "@phosphor-icons/react/ssr";

export type TopicCardData = {
  key: string;
  title: string;
  area: string;
  /** true cuando el tema ya está investigado a fondo (tiene ficha escrita). */
  deep: boolean;
};

/**
 * La rejilla de tus temas. Componente de servidor: no baja nada de JavaScript.
 * Con `done` pinta los que ya cerraste, más discretos y sin quitarle lugar a lo
 * que sigue pendiente.
 */
export function TopicGrid({ topics, done = false }: { topics: TopicCardData[]; done?: boolean }) {
  return (
    <ul className={`grid gap-3 sm:grid-cols-2 ${done ? "lg:grid-cols-4" : "lg:grid-cols-3"}`}>
      {topics.map((t) => (
        <li key={t.key}>
          {/* Sin precarga: son muchos enlaces y cada precarga es un render completo del servidor. */}
          <Link
            href={`/descubrir/${encodeURIComponent(t.key)}`}
            prefetch={false}
            className={`press flex h-full items-center gap-3 ${done ? "rounded-card bg-surface p-3.5" : "card p-4"}`}
          >
            {done && <CheckCircle size={20} weight="fill" className="shrink-0 text-ok" aria-hidden />}
            <span className="min-w-0 flex-1">
              <span className={`block text-balance ${done ? "footnote font-semibold text-ink-2" : "headline"}`}>{t.title}</span>
              {!done && (
                <span className="caption mt-1 block text-ink-2">
                  {t.area}
                  {t.deep ? " · ficha completa" : ""}
                </span>
              )}
            </span>
            {!done && <ArrowRight size={18} className="shrink-0 text-ink-3" aria-hidden />}
          </Link>
        </li>
      ))}
    </ul>
  );
}
