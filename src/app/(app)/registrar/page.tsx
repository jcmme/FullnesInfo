import Link from "next/link";
import { CaretLeft } from "@phosphor-icons/react/ssr";
import { EntryForm } from "@/components/entry-form";
import { getTopic } from "@/lib/mystery";
import { getSession } from "@/lib/session";
import type { Item } from "@/lib/types";

export const metadata = { title: "Registrar" };

export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ item?: string; mystery?: string }> }) {
  const { supabase, userId, profile } = await getSession();
  const params = await searchParams;

  const [itemsRes, mysteryRes] = await Promise.all([
    supabase
      .from("items")
      .select("*")
      .eq("user_id", userId)
      .in("status", ["en_curso", "pendiente", "terminado"])
      .order("updated_at", { ascending: false })
      .limit(20),
    params.mystery
      ? supabase.from("mystery_opens").select("*").eq("user_id", userId).eq("id", params.mystery).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  let items = (itemsRes.data ?? []) as Item[];
  if (params.item && !items.some((i) => i.id === params.item)) {
    const { data } = await supabase.from("items").select("*").eq("user_id", userId).eq("id", params.item).maybeSingle();
    if (data) items = [data as Item, ...items];
  }
  if (params.item) items = [...items.filter((i) => i.id === params.item), ...items.filter((i) => i.id !== params.item)];

  const topic = mysteryRes.data ? getTopic(mysteryRes.data.topic_id) : undefined;
  const mystery = topic && mysteryRes.data ? { id: mysteryRes.data.id as string, title: topic.title, questions: topic.questions } : null;

  return (
    <div className="mx-auto max-w-2xl pt-safe">
      <div className="px-2 pt-3 md:px-6">
        <Link href="/" className="btn btn-ghost min-h-11 px-2">
          <CaretLeft size={20} aria-hidden />
          Hoy
        </Link>
      </div>
      <div className="px-4 md:px-8">
        <h1 className="title-large mt-1">{mystery ? "Lo que investigaste" : "Registrar"}</h1>
        <p className="footnote mb-6 mt-1 text-ink-2">
          {mystery ? `Caja misteriosa: ${mystery.title}` : "Lo que consumiste hoy y lo que te llevas."}
        </p>
        <EntryForm minWords={profile.min_words} items={items} initialItemId={params.item ?? null} mystery={mystery} />
      </div>
    </div>
  );
}
