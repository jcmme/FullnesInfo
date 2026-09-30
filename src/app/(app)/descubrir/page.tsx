import Link from "next/link";
import { ArrowRight, Compass, SlidersHorizontal, X } from "@phosphor-icons/react/ssr";
import { AreaBoard, labelOfArea, type AreaProgress } from "@/components/area-board";
import { DailyQuiz } from "@/components/daily-quiz";
import { MysteryBox } from "@/components/mystery-box";
import { PageHeader, Section } from "@/components/page-header";
import { TopicDeck, type DeckTopic } from "@/components/topic-deck";
import { TopicGrid } from "@/components/topic-grid";
import { TopicList, type TopicPreview } from "@/components/topic-list";
import { AREA_LIST, areaLabelOf, areaOf, surprisesFor, topicCounts } from "@/lib/areas";
import { formatCutoff } from "@/lib/day";
import { todayKey } from "@/lib/engine";
import { getTopic } from "@/lib/mystery";
import { notesOfToday, wordsOfToday } from "@/lib/notes";
import { getSession } from "@/lib/session";
import { challengeOfDay, getPack } from "@/lib/topics";
import type { Entry, Interest, MysteryOpen } from "@/lib/types";

export const metadata = { title: "Descubrir" };

export default async function DiscoverPage({ searchParams }: { searchParams: Promise<{ area?: string }> }) {
  const { supabase, userId, profile } = await getSession();
  const today = todayKey(profile);
  const { area: areaParam } = await searchParams;
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
  // El tablero filtra la pantalla entera, igual que el estado en Guardados.
  const area = AREA_LIST.some((a) => a.id === areaParam) ? (areaParam as string) : null;

  // Los que ya decidiste no vuelven a salir de sorpresa.
  const decided = new Set(interests.map((i) => i.key));
  if (todayOpen) decided.add(todayOpen.topic_id);
  const deck: DeckTopic[] = surprisesFor(area ? [area] : areas, decided, 8).map((t) => ({
    key: t.id,
    title: t.title,
    hook: t.hook,
    area: areaOf(t),
    areaLabel: areaLabelOf(areaOf(t)),
  }));

  // Los que dijiste que te interesan. Los que ya cerraste (escribiste tu nota o
  // los marcaste terminados) se salen de la lista y viven en Completados.
  const mine = interests.filter((i) => i.status !== "descartado" && (!area || areaOf(i) === area));
  const preview = (i: Interest): TopicPreview => {
    const pack = getPack(i.key);
    const catalog = getTopic(i.key);
    return {
      key: i.key,
      title: pack?.title ?? catalog?.title ?? i.label,
      area: areaLabelOf(areaOf(i)),
      deep: Boolean(pack),
      summary: pack?.summary ?? catalog?.hook ?? "Todavía no hay ficha escrita de este tema.",
      fact: pack?.facts[0] ?? null,
    };
  };
  const pending = mine.filter((i) => !i.read_at).map(preview);
  const done = mine
    .filter((i) => i.read_at)
    .sort((a, b) => (b.read_at ?? "").localeCompare(a.read_at ?? ""))
    .map((i) => {
      const { key, title, area: label, deep } = preview(i);
      return { key, title, area: label, deep };
    });

  // El tablero: cuántos temas de cada área ya cerraste, sobre los que hay escritos.
  const totals = topicCounts();
  const cerradosPorArea = new Map<string, number>();
  for (const i of interests) {
    if (i.status === "descartado" || !i.read_at) continue;
    const a = areaOf(i);
    cerradosPorArea.set(a, (cerradosPorArea.get(a) ?? 0) + 1);
  }
  const board: AreaProgress[] = (areas.length ? areas : AREA_LIST.map((a) => a.id))
    .filter((id) => (totals[id] ?? 0) > 0)
    .map((id) => ({ id, label: areaLabelOf(id), done: cerradosPorArea.get(id) ?? 0, total: totals[id] ?? 0 }));

  const rounds = challengeOfDay(
    interests.filter((i) => i.status !== "descartado").map((i) => i.key),
    areas,
    today,
  );

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

      {rounds.length > 0 && (
        <Section className="mt-8">
          <DailyQuiz rounds={rounds} day={today} />
        </Section>
      )}

      {board.length > 0 && (
        <Section
          title="Tus áreas"
          className="mt-8"
          action={
            area ? (
              <Link href="/descubrir" prefetch={false} className="press flex items-center gap-1 footnote font-semibold text-tint-ink">
                <X size={14} weight="bold" aria-hidden />
                Quitar filtro
              </Link>
            ) : undefined
          }
        >
          <AreaBoard areas={board} active={area} />
        </Section>
      )}

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
        <Section title={area ? `Más de ${labelOfArea(area)}` : "¿Quieres más?"} className="mt-8">
          <TopicDeck key={area ?? "todas"} topics={deck} />
        </Section>
      )}

      {pending.length > 0 && (
        <Section title="Tus temas" className="mt-8">
          <TopicList topics={pending} />
        </Section>
      )}

      {done.length > 0 && (
        <Section
          title="Completados"
          className="mt-8"
          action={<span className="caption text-ink-2 tabular">{done.length}</span>}
        >
          <TopicGrid topics={done} done />
        </Section>
      )}
    </>
  );
}
