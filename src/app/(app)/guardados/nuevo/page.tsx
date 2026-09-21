import Link from "next/link";
import { CaretLeft } from "@phosphor-icons/react/ssr";
import { NewItemForm } from "@/components/new-item-form";
import { hasYouTubeKey } from "@/lib/media";

export const metadata = { title: "Nuevo guardado" };

export default function NewItemPage() {
  return (
    <div className="mx-auto max-w-2xl pt-safe">
      <div className="px-2 pt-3 md:px-6">
        <Link href="/guardados" className="btn btn-ghost min-h-11 px-2">
          <CaretLeft size={20} aria-hidden />
          Guardados
        </Link>
      </div>
      <div className="px-4 pb-10 md:px-8">
        <h1 className="title-large mb-6 mt-1">Nuevo guardado</h1>
        <NewItemForm hasYouTube={hasYouTubeKey()} />
      </div>
    </div>
  );
}
