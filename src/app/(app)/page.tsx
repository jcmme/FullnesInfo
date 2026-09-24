import Link from "next/link";
import { ArrowRight, CheckCircle, Fire, Gift, Lock, PencilSimple, Plus, Snowflake, WarningCircle } from "@phosphor-icons/react/ssr";
import { Countdown } from "@/components/countdown";
import { DayRings } from "@/components/day-rings";
import { FreezeTodayButton } from "@/components/freeze-button";
import { Heatmap } from "@/components/heatmap";
import { ItemRow, ItemTile } from "@/components/item-cards";
import { ProgressBar } from "@/components/media";
import { PageHeader, Section } from "@/components/page-header";
import { StreakNumber } from "@/components/streak";
import { formatDayLong, formatDayShort } from "@/lib/day";
import { getOverview, todayKey } from "@/lib/engine";
import { formatNumber, formatRemaining } from "@/lib/format";
import { getTopic, RARITY_LABEL } from "@/lib/mystery";
import { getSession } from "@/lib/session";
import type { Entry, Failure, Item, MysteryOpen, Punishment } from "@/lib/types";

export default async function TodayPage({ searchParams }: { searchParams: Promise<{ cumplido?: string }> }) {
  const { supabase, userId, profile, now } = await getSession();
  const { cumplido } = await searchParams;
  const today = todayKey(profile, new Date(now));

  const [overview, failuresRes, punishmentsRes, inProgressRes, toLinkRes, mysteryRes, entriesRes, allItemsRes] = await Promise.all([
    getOverview(supabase, profile),
    supabase.from("failures").select("*").eq("user_id", userId).eq("status", "pendiente").order("day"),
    supabase.from("punishments").select("*").eq("user_id", userId).in("status", ["asignado", "en_curso"]).order("created_at"),
    supabase.from("items").select("*").eq("user_id", userId).in("status", ["en_curso", "pendiente"]).order("updated_at", { ascending: false }).limit(10),
    supabase.from("items").select("*").eq("user_id", userId).eq("status", "por_vincular").order("created_at", { ascending: false }).limit(4),
    supabase.from("mystery_opens").select("*").eq("user_id", userId).eq("day", today).maybeSingle(),
    supabase.from("entries").select("*").eq("user_id", userId).eq("day", today).order("created_at"),
    supabase.from("items").select("id", { count: "exact", head: true }).eq("user_id", userId),
  ]);

  const failures = (failuresRes.data ?? []) as Failure[];
  const punishments = (punishmentsRes.data ?? []) as Punishment[];
  const items = (inProgressRes.data ?? []) as Item[];
  const inProgress = items.filter((i) => i.status === "en_curso");
  const continueList = inProgress.length ? inProgress : items.slice(0, 6);
  const toLink = (toLinkRes.data ?? []) as Item[];
  const mystery = mysteryRes.data as MysteryOpen | null;
  const topic = mystery ? getTopic(mystery.topic_id) : undefined;
  const entries = (entriesRes.data ?? []) as Entry[];

  return (
    <>
      <PageHeader title="Hoy" subtitle={<span className="first-letter:uppercase">{formatDayLong(overview.today)}</span>} />

      <div className="md:grid md:grid-cols-[minmax(0,1fr)_20rem] md:gap-2 lg:grid-cols-[minmax(0,1fr)_23rem]">
        <div className="min-w-0">
          {failures.length > 0 && (
            <Section>
              <Link href="/castigos" className="press flex items-center gap-3 rounded-card bg-bad-soft p-4 text-bad">
                <WarningCircle size={28} weight="fill" className="shrink-0" aria-hidden />
                <div className="min-w-0 flex-1">
                  <p className="headline">
                    {failures.length === 1
                      ? `Fallaste el ${formatDayShort(failures[0].day)}`
                      : `Fallaste ${failures.length} días`}
                  </p>
                  <p className="footnote">Gira la ruleta para saber tu castigo. En 24 h se gira sola.</p>
                </div>
                <ArrowRight size={20} className="shrink-0" aria-hidden />
              </Link>
            </Section>
          )}

          <Section className={failures.length ? "mt-6" : "mt-2"}>
            <div className="flex flex-col items-center gap-3">
              <DayRings
                words={overview.todayWords}
                minWords={profile.min_words}
                timezone={profile.timezone}
                cutoffHour={profile.cutoff_hour}
              />
              <div className="flex flex-wrap justify-center gap-x-5 gap-y-1 footnote">
                <span className="flex items-center gap-1.5">
                  <span className="size-2.5 rounded-full bg-tint" aria-hidden />
                  Tus palabras
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="size-2.5 rounded-full bg-[var(--ring-2)]" aria-hidden />
                  <Countdown timezone={profile.timezone} cutoffHour={profile.cutoff_hour} done={overview.todayDone || overview.todayFrozen} />
                </span>
              </div>
              <div className="text-center">
                {overview.todayDone ? (
                  <p className="flex items-center justify-center gap-1.5 headline text-ok">
                    <CheckCircle size={20} weight="fill" aria-hidden />
                    Día cumplido
                  </p>
                ) : overview.todayFrozen ? (
                  <p className="flex items-center justify-center gap-1.5 headline text-rare">
                    <Snowflake size={20} weight="bold" aria-hidden />
                    Hoy usaste comodín
                  </p>
                ) : (
                  <p className="headline">
                    {overview.todayWords > 0
                      ? profile.min_words - overview.todayWords === 1
                        ? "Te falta 1 palabra"
                        : `Te faltan ${formatNumber(profile.min_words - overview.todayWords)} palabras`
                      : "Falta tu nota de hoy"}
                  </p>
                )}
                <p className="footnote mt-0.5 text-ink-2">
                  {overview.todayDone
                    ? "Mañana sigue. Si escribes más, también cuenta."
                    : overview.todayFrozen
                      ? "Este día no rompe tu racha."
                      : "Todas tus notas del día suman."}
                </p>
              </div>
            </div>

            <div className="mt-5 flex flex-col items-center gap-1">
              <Link
                href={entries.length ? `/registrar?nota=${entries[entries.length - 1].id}` : "/registrar"}
                className={`btn btn-lg w-full ${overview.todayDone ? "btn-secondary" : "btn-primary"}`}
              >
                <PencilSimple size={20} aria-hidden />
                {entries.length ? "Seguir escribiendo" : "Escribir mi nota"}
              </Link>
              {!overview.todayDone && !overview.todayFrozen && <FreezeTodayButton left={overview.freezesLeft} />}
            </div>

            <div className="mt-3 grid grid-cols-2 gap-3">
              <div className="rounded-card bg-surface p-4">
                <p className="numeral flex items-center gap-1.5 text-[2.125rem] text-tint-ink">
                  <Fire size={24} weight="fill" aria-hidden />
                  <StreakNumber value={overview.streak} celebrate={cumplido === "1"} />
                </p>
                <p className="footnote mt-1 text-ink-2">{overview.streak === 1 ? "día seguido" : "días seguidos"}</p>
              </div>
              <div className="rounded-card bg-surface p-4">
                <p className="numeral text-[2.125rem]">{overview.best}</p>
                <p className="footnote mt-1 text-ink-2">tu récord</p>
              </div>
            </div>

            {entries.length > 0 && (
              <div className="mt-4 rounded-card bg-surface px-4">
                <h2 className="sr-only">Tus notas de hoy</h2>
                <ul className="divide-y hairline">
                  {entries.map((e) => (
                    <li key={e.id}>
                      <Link href={`/registrar?nota=${e.id}`} className="press flex min-h-12 items-center gap-3 py-2.5">
                        <span className="footnote min-w-0 flex-1 truncate">{e.title}</span>
                        <span className="caption shrink-0 tabular text-ink-2">{e.word_count} palabras</span>
                        <span className="caption shrink-0 font-semibold text-tint-ink">Seguir</span>
                      </Link>
                    </li>
                  ))}
                </ul>
                <Link href="/registrar?nuevo=1" className="press flex min-h-12 items-center gap-2 border-t hairline footnote font-semibold text-tint-ink">
                  <Plus size={16} weight="bold" aria-hidden />
                  Escribir sobre algo más
                </Link>
              </div>
            )}
          </Section>

          {punishments.length > 0 && (
            <Section title="Castigos activos" action={<Link href="/castigos" className="footnote font-semibold text-tint-ink">Ver todos</Link>}>
              <ul className="card divide-y hairline px-4">
                {punishments.map((p) => {
                  const deadline = p.status === "asignado" ? p.start_by : p.due_at;
                  const left = deadline ? new Date(deadline).getTime() - now : 0;
                  return (
                    <li key={p.id}>
                      <Link href={`/castigos/${p.id}`} className="press flex items-center gap-3 py-3.5">
                        <div className="min-w-0 flex-1">
                          <p className="headline first-letter:uppercase">{p.title}</p>
                          <p className={`footnote mt-0.5 ${left < 6 * 3_600_000 ? "text-bad" : "text-ink-2"}`}>
                            {p.status === "asignado"
                              ? `Empiézalo antes de ${formatRemaining(left)}`
                              : `${formatNumber(Number(p.progress), 1)} de ${formatNumber(Number(p.target))} · quedan ${formatRemaining(left)}`}
                          </p>
                          {p.status === "en_curso" && (
                            <div className="mt-2">
                              <ProgressBar value={Number(p.progress) / Number(p.target)} tone="bad" label="Avance del castigo" />
                            </div>
                          )}
                        </div>
                        <ArrowRight size={18} className="shrink-0 text-ink-3" aria-hidden />
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </Section>
          )}

          {continueList.length > 0 && (
            <Section
              title={inProgress.length ? "Sigue donde te quedaste" : "Pendientes en tu biblioteca"}
              action={<Link href="/guardados" className="footnote font-semibold text-tint-ink">Biblioteca</Link>}
            >
              <div className="-mx-4 flex snap-x snap-mandatory scroll-px-4 gap-4 overflow-x-auto px-4 pb-2 [scrollbar-width:none] md:-mx-8 md:scroll-px-8 md:px-8">
                {continueList.map((item) => (
                  <ItemTile key={item.id} item={item} />
                ))}
              </div>
            </Section>
          )}

          {toLink.length > 0 && (
            <Section title="Por vincular" action={<Link href="/guardados?estado=por_vincular" className="footnote font-semibold text-tint-ink">Ver todos</Link>}>
              <div className="card divide-y hairline px-4">
                {toLink.map((item) => (
                  <ItemRow key={item.id} item={item} />
                ))}
              </div>
            </Section>
          )}

          {items.length === 0 && toLink.length === 0 && (
            <Section title="Tu biblioteca">
              {(allItemsRes.count ?? 0) > 0 ? (
                <div className="card p-5">
                  <p className="headline">Terminaste todo lo que guardaste</p>
                  <p className="footnote mt-1 max-w-[46ch] text-ink-2">
                    Cuando veas otro clip que valga la pena, guárdalo y busco el original.
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Link href="/guardados/nuevo" className="btn btn-secondary">
                      Guardar otro
                    </Link>
                    <Link href="/guardados?estado=terminado" className="btn btn-ghost px-3">
                      Ver terminados
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="card p-5">
                  <p className="headline">Aquí aparece lo que guardas</p>
                  <p className="footnote mt-1 max-w-[46ch] text-ink-2">
                    Escribe el nombre del video que viste en Instagram y Fuellness busca el original en YouTube, con su
                    miniatura, duración y capítulos.
                  </p>
                  <Link href="/guardados/nuevo" className="btn btn-secondary mt-4">
                    Guardar el primero
                  </Link>
                </div>
              )}
            </Section>
          )}
        </div>

        <aside className="min-w-0">
          <Section title="Caja de hoy">
            {topic ? (
              <Link href="/caja" className="press card block p-5">
                <p className="title-2 text-balance">{topic.title}</p>
                <p className="footnote mt-1 text-ink-2 text-pretty">{topic.hook}</p>
                <p className="mt-3 flex items-center justify-between gap-3">
                  <span
                    className={`chip ${
                      topic.rarity === "legendaria"
                        ? "bg-legend/15 text-legend"
                        : topic.rarity === "rara"
                          ? "bg-rare/15 text-rare"
                          : "bg-surface-2 text-ink-2"
                    }`}
                  >
                    {RARITY_LABEL[topic.rarity]}
                  </span>
                  <span className={`footnote font-semibold ${mystery?.status === "investigada" ? "text-ok" : "text-tint-ink"}`}>
                    {mystery?.status === "investigada" ? "Investigada" : "Investigar ahora"}
                  </span>
                </p>
              </Link>
            ) : failures.length > 0 ? (
              <div className="card flex items-center gap-3 p-5 text-ink-2">
                <Lock size={26} aria-hidden className="shrink-0" />
                <p className="footnote">La caja se abre cuando gires la ruleta de tus días fallados.</p>
              </div>
            ) : (
              <Link href="/caja" className="press card flex items-center gap-4 p-5">
                <span className="grid size-14 shrink-0 place-items-center rounded-control bg-tint-soft text-tint-ink">
                  <Gift size={30} weight="duotone" aria-hidden />
                </span>
                <span className="min-w-0">
                  <span className="headline block">Sigue cerrada</span>
                  <span className="footnote block text-ink-2">Un tema nuevo para investigar hoy. Puede salir legendario.</span>
                </span>
              </Link>
            )}
          </Section>

          <Section title="Últimas 18 semanas">
            <div className="card p-4">
              <Heatmap cells={overview.cells} minWords={profile.min_words} />
              <p className="caption mt-3 text-ink-2">
                {overview.totalDays} {overview.totalDays === 1 ? "día cumplido" : "días cumplidos"} en total.{" "}
                {overview.freezesLeft} {overview.freezesLeft === 1 ? "comodín disponible" : "comodines disponibles"} este mes.
              </p>
            </div>
          </Section>
        </aside>
      </div>
    </>
  );
}
