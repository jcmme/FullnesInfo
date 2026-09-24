import Link from "next/link";
import { MagnifyingGlass, Plus } from "@phosphor-icons/react/ssr";
import { ItemRow, ItemTile } from "@/components/item-cards";
import { PageHeader, Section } from "@/components/page-header";
import { getSession } from "@/lib/session";
import type { Item, ItemStatus } from "@/lib/types";

export const metadata = { title: "Guardados" };

const FILTERS: { value: ItemStatus | "todos"; label: string }[] = [
  { value: "todos", label: "Todos" },
  { value: "por_vincular", label: "Por vincular" },
  { value: "en_curso", label: "En curso" },
  { value: "pendiente", label: "Pendientes" },
  { value: "terminado", label: "Terminados" },
];

export default async function LibraryPage({ searchParams }: { searchParams: Promise<{ estado?: string; q?: string }> }) {
  const { supabase, userId } = await getSession();
  const { estado = "todos", q = "" } = await searchParams;
  const filter = FILTERS.some((f) => f.value === estado) ? estado : "todos";

  let query = supabase.from("items").select("*").eq("user_id", userId).order("updated_at", { ascending: false }).limit(200);
  if (filter !== "todos") query = query.eq("status", filter);
  const term = q.trim().replace(/[%,()*\\"]/g, " ").slice(0, 80);
  if (term) query = query.or(`title.ilike.%${term}%,media_title.ilike.%${term}%,media_author.ilike.%${term}%,note.ilike.%${term}%`);

  const [{ data }, countsRes] = await Promise.all([
    query,
    supabase.from("items").select("status").eq("user_id", userId),
  ]);
  const items = (data ?? []) as Item[];
  const counts = new Map<string, number>();
  for (const row of countsRes.data ?? []) counts.set(row.status, (counts.get(row.status) ?? 0) + 1);
  const total = countsRes.data?.length ?? 0;

  const hrefFor = (value: string) => {
    const params = new URLSearchParams();
    if (value !== "todos") params.set("estado", value);
    if (q) params.set("q", q);
    const s = params.toString();
    return s ? `/guardados?${s}` : "/guardados";
  };

  return (
    <>
      <PageHeader
        title="Guardados"
        subtitle={`${total} ${total === 1 ? "cosa guardada" : "cosas guardadas"}`}
        action={
          <Link href="/guardados/nuevo" className="btn btn-primary">
            <Plus size={18} weight="bold" aria-hidden />
            Guardar
          </Link>
        }
      />

      <Section>
        <form action="/guardados" className="relative">
          {filter !== "todos" && <input type="hidden" name="estado" value={filter} />}
          <MagnifyingGlass size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-3" aria-hidden />
          <input
            type="search"
            name="q"
            defaultValue={q}
            enterKeyHint="search"
            placeholder="Buscar en tu biblioteca"
            aria-label="Buscar en tu biblioteca"
            className="field pl-9"
          />
        </form>

        <nav aria-label="Filtrar por estado" className="-mx-4 mt-3 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] md:mx-0 md:px-0">
          {FILTERS.map((f) => {
            const active = filter === f.value;
            const count = f.value === "todos" ? total : counts.get(f.value) ?? 0;
            return (
              <Link
                key={f.value}
                href={hrefFor(f.value)}
                aria-current={active ? "page" : undefined}
                className={`press chip min-h-9 shrink-0 px-3.5 ${active ? "bg-ink text-bg" : "bg-surface-2 text-ink-2"}`}
              >
                {f.label}
                {count > 0 && <span className={`tabular ${active ? "opacity-70" : "text-ink-3"}`}>{count}</span>}
              </Link>
            );
          })}
        </nav>
      </Section>

      <Section className="mt-5">
        {items.length === 0 ? (
          <div className="card p-6 text-center">
            <p className="headline">{q ? `Nada coincide con “${q}”` : total ? "Nada en este filtro" : "Tu biblioteca está vacía"}</p>
            <p className="footnote mx-auto mt-1 max-w-[42ch] text-ink-2">
              {total
                ? "Prueba otro filtro o una palabra distinta."
                : "Cada vez que guardes un clip en Instagram, anótalo aquí. También puedes hacerlo desde el menú Compartir con el Atajo (ver Ajustes)."}
            </p>
            {!total && (
              <Link href="/guardados/nuevo" className="btn btn-primary mt-4">
                Guardar el primero
              </Link>
            )}
          </div>
        ) : (
          <>
            <div className="card divide-y hairline px-4 md:hidden">
              {items.map((item) => (
                <ItemRow key={item.id} item={item} showStatus={filter === "todos"} />
              ))}
            </div>
            <div className="hidden grid-cols-2 gap-x-5 gap-y-7 md:grid lg:grid-cols-3 xl:grid-cols-4 [&>a]:w-auto">
              {items.map((item) => (
                <ItemTile key={item.id} item={item} />
              ))}
            </div>
          </>
        )}
      </Section>
    </>
  );
}
