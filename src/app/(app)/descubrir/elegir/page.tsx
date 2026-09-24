import Link from "next/link";
import { CaretLeft } from "@phosphor-icons/react/ssr";
import { AreaPicker } from "@/components/area-picker";
import { AREA_LIST, topicCounts } from "@/lib/areas";
import { getSession } from "@/lib/session";

export const metadata = { title: "Tus áreas" };

export default async function ChooseAreasPage() {
  const { profile } = await getSession();
  return (
    <div className="mx-auto max-w-2xl pt-safe">
      <div className="px-2 pt-3 md:px-6">
        <Link href="/descubrir" className="btn btn-ghost min-h-11 px-2">
          <CaretLeft size={20} aria-hidden />
          Descubrir
        </Link>
      </div>
      <div className="px-4 md:px-8">
        <h1 className="title-large mt-1">¿Qué te late?</h1>
        <p className="footnote mb-4 mt-1 text-pretty text-ink-2">
          Elige áreas. Los temas te llegan solos, de sorpresa, de lo que marques aquí.
        </p>
        <AreaPicker areas={AREA_LIST} counts={topicCounts()} initial={profile.areas ?? []} />
      </div>
    </div>
  );
}
