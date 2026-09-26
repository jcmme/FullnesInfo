import Link from "next/link";
import { CaretLeft } from "@phosphor-icons/react/ssr";
import { EntryForm, type MysteryToday, type TopicToday } from "@/components/entry-form";
import { todayKey } from "@/lib/engine";
import { getTopic } from "@/lib/mystery";
import { notesOfToday, subjectKeyOf, wordsOfToday } from "@/lib/notes";
import { getSession } from "@/lib/session";
import { getPack } from "@/lib/topics";
import type { Entry, Interest, Item } from "@/lib/types";

export const metadata = { title: "Tu nota" };

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ nota?: string; nuevo?: string }>;
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

  const items = (itemsRes.data ?? []) as Item[];
  const todayNotes = notesOfToday((entriesRes.data ?? []) as Entry[]);
  const todayWords = wordsOfToday(todayNotes);

  const topic = mysteryRes.data ? getTopic(mysteryRes.data.topic_id) : undefined;
  const mystery: MysteryToday | null =
    topic && mysteryRes.data ? { id: mysteryRes.data.id as string, title: topic.title, questions: topic.questions } : null;

  // Como temas solo salen los que ya tienen nota de hoy: escribir de un tema nuevo
  // se hace en su ficha, junto al material. Aquí se continúan.
  const interests = (interestsRes.data ?? []) as Interest[];
  const openKeys = new Set(todayNotes.map((n) => n.topicKey).filter(Boolean) as string[]);
  const topics: TopicToday[] = [...openKeys].map((key) => {
    const pack = getPack(key);
    const catalog = getTopic(key);
    return {
      key,
      title: pack?.title ?? catalog?.title ?? interests.find((i) => i.key === key)?.label ?? key.replace(/^propio:/, "").replace(/-/g, " "),
      questions: pack?.questions ?? catalog?.questions ?? [],
    };
  });

  // ?nota= continúa esa nota; ?nuevo= empieza otra.
  const fromNote = params.nota ? todayNotes.find((n) => n.id === params.nota) : undefined;
  const initialKey = params.nuevo ? "otro:nuevo" : fromNote ? subjectKeyOf(fromNote) : null;

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
