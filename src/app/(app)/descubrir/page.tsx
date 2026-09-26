import Link from "next/link";
import { ArrowRight, Compass, SlidersHorizontal } from "@phosphor-icons/react/ssr";
import { MysteryBox } from "@/components/mystery-box";
import { PageHeader, Section } from "@/components/page-header";
import { TopicDeck, type DeckTopic } from "@/components/topic-deck";
import { TopicGrid } from "@/components/topic-grid";
import { areaLabelOf, areaOf, surprisesFor } from "@/lib/areas";
import { formatCutoff } from "@/lib/day";
import { todayKey } from "@/lib/engine";
import { getTopic } from "@/lib/mystery";
import { notesOfToday, wordsOfToday } from "@/lib/notes";
import { getSession } from "@/lib/session";
import { getPack } from "@/lib/topics";
import type { Entry, Interest, MysteryOpen } from "@/lib/types";

export const metadata = { title: "Descubrir" };

export default async function DiscoverPage() {
  const { supabase, userId, profile } = await getSession();
  const today = todayKey(profile);
  const [opensRes, failuresRes, interestsRes, entriesRes] = await Promise.all([
    supabase.from("mystery_opens").select("*").eq("user_id", userId).eq("day", today).maybeSingle(),
    supabase.from("failures").select("id", { count: "exact", head: true }).eq("user_id", userId).eq("status", "pendiente"),
    supabase.from("interests").select("*").eq("user_id", userId).order("position", { ascending: false }),
    supabase.from("entries").select("*").eq("user_id", userId).eq("day", today).order("created_at"),
  ]);
  const todayOpen = opensRes.data as MysteryOpen | null;
  const interests = (interestsRes.data ?? []) as Interest[];
  const areas = profile.areas ?? [];
  // La nota de la caja se escribe dentro de la caja: necesita el total del día.
  const todayNotes = notesOfToday((entriesRes.data ?? []) as Entry[]);

  // Los que ya decidiste no vuelven a salir de sorpresa.
  const decided = new Set(interests.map((i) => i.key));
  if (todayOpen) decided.add(todayOpen.topic_id);
  const deck: DeckTopic[] = surprisesFor(areas, decided, 8).map((t) => ({
    key: t.id,
    title: t.title,
    hook: t.hook,
    area: areaOf(t),
    areaLabel: areaLabelOf(areaOf(t)),
  }));

  const mine = interests
    .filter((i) => i.status !== "descartado")
    .map((i) => ({
      key: i.key,
      title: getPack(i.key)?.title ?? getTopic(i.key)?.title ?? i.label,
      area: areaLabelOf(i.area),
      deep: Boolean(getPack(i.key)),
      read: Boolean(i.read_at),
    }));

  return (
    <>
      <PageHeader
        title="Descubrir"
        subtitle={areas.length ? `${areas.length} ${areas.length === 1 ? "área elegida" : "áreas elegidas"}` : undefined}
        action={
          areas.length ? (
            <Link href="/descubrir/elegir" className="btn btn-secondary">
              <SlidersHorizontal size={18} aria-hidden />
              Áreas
            </Link>
          ) : undefined
        }
      />

      <Section title="Caja de hoy">
        <div className="mx-auto max-w-2xl">
          <MysteryBox
            initialOpen={todayOpen}
            initialTopic={todayOpen ? getTopic(todayOpen.topic_id) ?? null : null}
            locked={(failuresRes.count ?? 0) > 0 && !todayOpen}
            cutoffLabel={formatCutoff(profile.cutoff_hour)}
            minWords={profile.min_words}
            todayNotes={todayNotes}
            todayWords={wordsOfToday(todayNotes)}
          />
        </div>
      </Section>

      {areas.length === 0 ? (
        <Section className="mt-8">
          <Link href="/descubrir/elegir" className="press card flex items-center gap-4 p-5">
            <span className="grid size-12 shrink-0 place-items-center rounded-[14px] bg-tint-soft text-tint-ink">
              <Compass size={26} aria-hidden />
            </span>
            <span className="min-w-0 flex-1">
              <span className="headline block">Dime qué te late</span>
              <span className="footnote mt-0.5 block text-pretty text-ink-2">
                Eliges tus áreas una vez y los temas empiezan a llegarte solos, con su ficha y sus recomendaciones.
              </span>
            </span>
            <ArrowRight size={20} className="shrink-0 text-ink-3" aria-hidden />
          </Link>
        </Section>
      ) : (
        <Section title="¿Quieres más?" className="mt-8">
          <TopicDeck topics={deck} />
        </Section>
      )}

      {mine.length > 0 && (
        <Section title="Tus temas" className="mt-8">
          <TopicGrid topics={mine} />
        </Section>
      )}
    </>
  );
}
