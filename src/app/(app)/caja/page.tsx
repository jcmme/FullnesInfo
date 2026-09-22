import { PageHeader, Section } from "@/components/page-header";
import { MysteryBox } from "@/components/mystery-box";
import { formatCutoff, formatDayShort } from "@/lib/day";
import { todayKey } from "@/lib/engine";
import { AREAS, getTopic, RARITY_LABEL, TOPICS } from "@/lib/mystery";
import { getSession } from "@/lib/session";
import type { MysteryOpen, Rarity } from "@/lib/types";

export const metadata = { title: "Caja misteriosa" };

const RARITY_TEXT: Record<Rarity, string> = { comun: "text-ink-2", rara: "text-rare", legendaria: "text-legend" };

export default async function MysteryPage() {
  const { supabase, userId, profile } = await getSession();
  const today = todayKey(profile);
  const [opensRes, failuresRes] = await Promise.all([
    supabase.from("mystery_opens").select("*").eq("user_id", userId).order("day", { ascending: false }),
    supabase.from("failures").select("id", { count: "exact", head: true }).eq("user_id", userId).eq("status", "pendiente"),
  ]);
  const opens = (opensRes.data ?? []) as MysteryOpen[];
  const todayOpen = opens.find((o) => o.day === today) ?? null;
  const history = opens.filter((o) => o.day !== today);
  const unique = new Set(opens.map((o) => o.topic_id));
  const legendary = opens.filter((o) => o.rarity === "legendaria").length;

  return (
    <>
      <PageHeader
        title="Caja misteriosa"
        subtitle={`${unique.size} de ${TOPICS.length} temas descubiertos${legendary ? ` · ${legendary} ${legendary === 1 ? "legendario" : "legendarios"}` : ""}`}
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

      {history.length > 0 && (
        <Section title="Tu colección">
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
