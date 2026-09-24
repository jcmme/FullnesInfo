import Link from "next/link";
import { ArrowRight, Compass, Plus } from "@phosphor-icons/react/ssr";
import { MysteryBox } from "@/components/mystery-box";
import { PageHeader, Section } from "@/components/page-header";
import { TopicGrid } from "@/components/topic-grid";
import { formatCutoff, formatDayShort } from "@/lib/day";
import { todayKey } from "@/lib/engine";
import { AREAS, getTopic, RARITY_LABEL, TOPICS } from "@/lib/mystery";
import { getSession } from "@/lib/session";
import { getPack } from "@/lib/topics";
import type { Interest, MysteryOpen, Rarity } from "@/lib/types";

export const metadata = { title: "Descubrir" };

const RARITY_TEXT: Record<Rarity, string> = { comun: "text-ink-2", rara: "text-rare", legendaria: "text-legend" };

export default async function DiscoverPage() {
  const { supabase, userId, profile } = await getSession();
  const today = todayKey(profile);
  const [opensRes, failuresRes, interestsRes] = await Promise.all([
    supabase.from("mystery_opens").select("*").eq("user_id", userId).order("day", { ascending: false }),
    supabase.from("failures").select("id", { count: "exact", head: true }).eq("user_id", userId).eq("status", "pendiente"),
    supabase.from("interests").select("*").eq("user_id", userId).order("position"),
  ]);
  const opens = (opensRes.data ?? []) as MysteryOpen[];
  const todayOpen = opens.find((o) => o.day === today) ?? null;
  const history = opens.filter((o) => o.day !== today);
  const unique = new Set(opens.map((o) => o.topic_id));
  const legendary = opens.filter((o) => o.rarity === "legendaria").length;

  const interests = (interestsRes.data ?? []) as Interest[];
  const topics = interests.map((i) => ({
    key: i.key,
    title: getPack(i.key)?.title ?? getTopic(i.key)?.title ?? i.label,
    area: AREAS[i.area] ?? "Tuyo",
    deep: Boolean(getPack(i.key)),
    read: Boolean(i.read_at),
  }));

  return (
    <>
      <PageHeader
        title="Descubrir"
        subtitle={`${unique.size} de ${TOPICS.length} cajas abiertas${legendary ? ` · ${legendary} ${legendary === 1 ? "legendaria" : "legendarias"}` : ""}`}
        action={
          topics.length > 0 ? (
            <Link href="/descubrir/elegir" className="btn btn-secondary">
              <Plus size={18} weight="bold" aria-hidden />
              Temas
            </Link>
          ) : undefined
        }
      />

      <Section>
        <div className="mx-auto max-w-2xl">
          <MysteryBox
            initialOpen={todayOpen}
            initialTopic={todayOpen ? getTopic(todayOpen.topic_id) ?? null : null}
            locked={(failuresRes.count ?? 0) > 0 && !todayOpen}
            cutoffLabel={formatCutoff(profile.cutoff_hour)}
          />
        </div>
      </Section>

      <Section title="Tus temas" className="mt-8">
        {topics.length === 0 ? (
          <Link href="/descubrir/elegir" className="press card flex items-center gap-4 p-5">
            <span className="grid size-12 shrink-0 place-items-center rounded-[14px] bg-tint-soft text-tint-ink">
              <Compass size={26} aria-hidden />
            </span>
            <span className="min-w-0 flex-1">
              <span className="headline block">Elige lo que te interesa</span>
              <span className="footnote mt-0.5 block text-pretty text-ink-2">
                Historia, ciencia, economía, lo que sea. Cada tema trae datos curiosos, su línea de tiempo y por dónde
                seguir.
              </span>
            </span>
            <ArrowRight size={20} className="shrink-0 text-ink-3" aria-hidden />
          </Link>
        ) : (
          <TopicGrid topics={topics} />
        )}
      </Section>

      {history.length > 0 && (
        <Section title="Tu colección" className="mt-8">
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {history.map((o) => {
              const topic = getTopic(o.topic_id);
              if (!topic) return null;
              return (
                <li key={o.id} className="card p-4">
                  <p className="headline text-balance">{topic.title}</p>
                  <p className="caption mt-1.5 text-ink-2">
                    <span className={`font-semibold ${RARITY_TEXT[o.rarity]}`}>{RARITY_LABEL[o.rarity]}</span>
                    {` en ${AREAS[topic.area] ?? topic.area}`}
                  </p>
                  <p className="caption mt-0.5 text-ink-2">
                    {formatDayShort(o.day)}, {o.status === "investigada" ? "investigada" : "sin investigar"}
                  </p>
                </li>
              );
            })}
          </ul>
        </Section>
      )}
    </>
  );
}
