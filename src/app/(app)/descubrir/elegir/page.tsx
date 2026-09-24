import Link from "next/link";
import { CaretLeft } from "@phosphor-icons/react/ssr";
import { TopicPicker, type PickerArea } from "@/components/topic-picker";
import { AREAS, TOPICS } from "@/lib/mystery";
import { getSession } from "@/lib/session";
import type { Interest } from "@/lib/types";

export const metadata = { title: "Tus temas" };

export default async function ChooseTopicsPage() {
  const { supabase, userId } = await getSession();
  const { data } = await supabase.from("interests").select("*").eq("user_id", userId).order("position");
  const interests = (data ?? []) as Interest[];

  const areas: PickerArea[] = Object.entries(AREAS).map(([key, label]) => ({
    key,
    label,
    topics: TOPICS.filter((t) => t.area === key).map((t) => ({ id: t.id, title: t.title, hook: t.hook, area: t.area })),
  }));

  return (
    <div className="mx-auto max-w-2xl pt-safe">
      <div className="px-2 pt-3 md:px-6">
        <Link href="/descubrir" className="btn btn-ghost min-h-11 px-2">
          <CaretLeft size={20} aria-hidden />
          Descubrir
        </Link>
      </div>
      <div className="px-4 md:px-8">
        <h1 className="title-large mt-1">Tus temas</h1>
        <p className="footnote mb-6 mt-1 text-pretty text-ink-2">
          Elige todos los que quieras. Cada uno se vuelve una ficha con datos curiosos, su línea de tiempo y por dónde
          seguir. Puedes cambiarlos cuando quieras.
        </p>
        <TopicPicker
          areas={areas}
          initial={interests.map((i) => ({ key: i.key, label: i.label, area: i.area }))}
        />
      </div>
    </div>
  );
}
