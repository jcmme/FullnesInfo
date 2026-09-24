import Link from "next/link";
import { CaretLeft } from "@phosphor-icons/react/ssr";
import { EntryForm, type MysteryToday, type TodayNote, type TopicToday } from "@/components/entry-form";
import { todayKey } from "@/lib/engine";
import { getTopic } from "@/lib/mystery";
import { getSession } from "@/lib/session";
import { getPack } from "@/lib/topics";
import type { Entry, Interest, Item } from "@/lib/types";

export const metadata = { title: "Tu nota" };

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ item?: string; mystery?: string; nota?: string; nuevo?: string; tema?: string }>;
}) {
  const { supabase, userId, profile, now } = await getSession();
  const params = await searchParams;
  const today = todayKey(profile, new Date(now));

  const [itemsRes, entriesRes, mysteryRes, interestsRes] = await Promise.all([
    supabase
      .from("items")
      .select("*")
      .eq("user_id", userId)
      .in("status", ["en_curso", "pendiente", "terminado"])
      .order("updated_at", { ascending: false })
      .limit(20),
    supabase.from("entries").select("*").eq("user_id", userId).eq("day", today).order("created_at"),
    supabase.from("mystery_opens").select("*").eq("user_id", userId).eq("day", today).maybeSingle(),
    supabase.from("interests").select("*").eq("user_id", userId).order("position"),
  ]);

  let items = (itemsRes.data ?? []) as Item[];
  if (params.item && !items.some((i) => i.id === params.item)) {
    const { data } = await supabase.from("items").select("*").eq("user_id", userId).eq("id", params.item).maybeSingle();
    if (data) items = [data as Item, ...items];
  }

  const entries = (entriesRes.data ?? []) as Entry[];
  const todayNotes: TodayNote[] = entries.map((e) => ({
    id: e.id,
    itemId: e.item_id,
    mysteryId: e.mystery_id,
    topicKey: e.topic_key,
    title: e.title,
    note: e.note,
    words: e.word_count,
  }));
  const todayWords = todayNotes.reduce((sum, n) => sum + n.words, 0);

  const topic = mysteryRes.data ? getTopic(mysteryRes.data.topic_id) : undefined;
  const mystery: MysteryToday | null =
    topic && mysteryRes.data ? { id: mysteryRes.data.id as string, title: topic.title, questions: topic.questions } : null;

  // Solo salen como tema el que abriste desde su ficha y los que ya tienen nota de hoy:
  // la lista de sujetos se queda corta y fácil de recorrer.
  const interests = (interestsRes.data ?? []) as Interest[];
  const openKeys = new Set([params.tema, ...todayNotes.map((n) => n.topicKey)].filter(Boolean) as string[]);
  const topics: TopicToday[] = interests
    .filter((i) => openKeys.has(i.key))
    .map((i) => {
      const pack = getPack(i.key);
      const catalog = getTopic(i.key);
      return {
        key: i.key,
        title: pack?.title ?? catalog?.title ?? i.label,
        questions: pack?.questions ?? catalog?.questions ?? [],
      };
    });

  const fromNote = params.nota ? todayNotes.find((n) => n.id === params.nota) : undefined;
  const noteKey = fromNote
    ? fromNote.itemId
      ? `item:${fromNote.itemId}`
      : fromNote.mysteryId
        ? `caja:${fromNote.mysteryId}`
        : fromNote.topicKey
          ? `tema:${fromNote.topicKey}`
          : `otro:${fromNote.id}`
    : null;
  // ?nota= continúa esa nota; ?item=, ?mystery= y ?tema= abren ese tema; ?nuevo= empieza otra.
  const initialKey = params.nuevo
    ? "otro:nuevo"
    : (noteKey ??
      (params.item
        ? `item:${params.item}`
        : params.tema && topics.some((t) => t.key === params.tema)
          ? `tema:${params.tema}`
          : params.mystery && mystery?.id === params.mystery
            ? `caja:${mystery.id}`
            : null));

  return (
    <div className="mx-auto max-w-2xl pt-safe">
      <div className="px-2 pt-3 md:px-6">
        <Link href="/" className="btn btn-ghost min-h-11 px-2">
          <CaretLeft size={20} aria-hidden />
          Hoy
        </Link>
      </div>
      <div className="px-4 md:px-8">
        <h1 className="title-large mt-1">Tu nota</h1>
        <p className="footnote mb-6 mt-1 text-ink-2">Lo que viste hoy y lo que te llevas. Todo lo que escribas hoy suma.</p>
        <EntryForm
          minWords={profile.min_words}
          items={items}
          mystery={mystery}
          topics={topics}
          todayNotes={todayNotes}
          todayWords={todayWords}
          initialKey={initialKey}
          initialNoteId={fromNote?.id ?? null}
        />
      </div>
    </div>
  );
}
