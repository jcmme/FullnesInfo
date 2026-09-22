import Link from "next/link";
import { CaretLeft } from "@phosphor-icons/react/ssr";
import { EntryForm, type MysteryToday, type TodayNote } from "@/components/entry-form";
import { todayKey } from "@/lib/engine";
import { getTopic } from "@/lib/mystery";
import { getSession } from "@/lib/session";
import type { Entry, Item } from "@/lib/types";

export const metadata = { title: "Tu nota" };

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ item?: string; mystery?: string; nota?: string; nuevo?: string }>;
}) {
  const { supabase, userId, profile, now } = await getSession();
  const params = await searchParams;
  const today = todayKey(profile, new Date(now));

  const [itemsRes, entriesRes, mysteryRes] = await Promise.all([
    supabase
      .from("items")
      .select("*")
      .eq("user_id", userId)
      .in("status", ["en_curso", "pendiente", "terminado"])
      .order("updated_at", { ascending: false })
      .limit(20),
    supabase.from("entries").select("*").eq("user_id", userId).eq("day", today).order("created_at"),
    supabase.from("mystery_opens").select("*").eq("user_id", userId).eq("day", today).maybeSingle(),
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
    title: e.title,
    note: e.note,
    words: e.word_count,
  }));
  const todayWords = todayNotes.reduce((sum, n) => sum + n.words, 0);

  const topic = mysteryRes.data ? getTopic(mysteryRes.data.topic_id) : undefined;
  const mystery: MysteryToday | null =
    topic && mysteryRes.data ? { id: mysteryRes.data.id as string, title: topic.title, questions: topic.questions } : null;

  // ?nota= continúa esa nota; ?item= y ?mystery= abren ese tema; ?nuevo= empieza una sobre otra cosa.
  const fromNote = params.nota ? todayNotes.find((n) => n.id === params.nota) : undefined;
  const noteKey = fromNote
    ? fromNote.itemId
      ? `item:${fromNote.itemId}`
      : fromNote.mysteryId
        ? `caja:${fromNote.mysteryId}`
        : `otro:${fromNote.id}`
    : null;
  const initialKey = params.nuevo
    ? "otro:nuevo"
    : (noteKey ??
      (params.item ? `item:${params.item}` : params.mystery && mystery?.id === params.mystery ? `caja:${mystery.id}` : null));

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
          todayNotes={todayNotes}
          todayWords={todayWords}
          initialKey={initialKey}
          initialNoteId={fromNote?.id ?? null}
        />
      </div>
    </div>
  );
}
