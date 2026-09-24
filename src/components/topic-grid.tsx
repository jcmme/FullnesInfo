import Link from "next/link";
import { ArrowRight } from "@phosphor-icons/react/ssr";

export type TopicCardData = {
  key: string;
  title: string;
  area: string;
  /** true cuando el tema ya está investigado a fondo (tiene ficha escrita). */
  deep: boolean;
  read: boolean;
};

/** La rejilla de tus temas. Componente de servidor: no baja nada de JavaScript. */
export function TopicGrid({ topics }: { topics: TopicCardData[] }) {
  return (
    <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {topics.map((t) => (
        <li key={t.key}>
          <Link href={`/descubrir/${encodeURIComponent(t.key)}`} className="press card flex h-full items-center gap-3 p-4">
            <span className="min-w-0 flex-1">
              <span className="headline block text-balance">{t.title}</span>
              <span className="caption mt-1 block text-ink-2">
                {t.area}
                {t.deep ? " · ficha completa" : ""}
                {t.read ? " · ya la leíste" : ""}
              </span>
            </span>
            <ArrowRight size={18} className="shrink-0 text-ink-3" aria-hidden />
          </Link>
        </li>
      ))}
    </ul>
  );
}
