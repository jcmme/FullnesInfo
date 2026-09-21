import Link from "next/link";
import { notFound } from "next/navigation";
import { CaretLeft, Info, XCircle } from "@phosphor-icons/react/ssr";
import { ActiveSession, StartPanel } from "@/components/punishment-session";
import { CHALLENGES, getChallenge, suggestPlans } from "@/lib/challenges";
import { formatDateTime } from "@/lib/format";
import { getSession } from "@/lib/session";
import type { Punishment, PunishmentLog } from "@/lib/types";

export default async function PunishmentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, userId, profile } = await getSession();
  const { data } = await supabase.from("punishments").select("*").eq("user_id", userId).eq("id", id).maybeSingle();
  if (!data) notFound();
  const p = data as Punishment;
  const challenge = getChallenge(p.challenge_id) ?? CHALLENGES[0];

  const [logsRes, siblingsRes, childRes] = await Promise.all([
    supabase.from("punishment_logs").select("*").eq("punishment_id", p.id).order("created_at", { ascending: false }),
    supabase.from("punishments").select("id").eq("user_id", userId).eq("challenge_id", p.challenge_id),
    p.status === "vencido"
      ? supabase.from("punishments").select("id, title").eq("user_id", userId).eq("parent_id", p.id).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);
  const logs = (logsRes.data ?? []) as PunishmentLog[];
  const siblingIds = (siblingsRes.data ?? []).map((s) => s.id as string);
  const { data: bestRow } = siblingIds.length
    ? await supabase
        .from("punishment_logs")
        .select("amount")
        .in("punishment_id", siblingIds)
        .order("amount", { ascending: false })
        .limit(1)
        .maybeSingle()
    : { data: null };
  const plans = suggestPlans(p);
  const child = childRes.data as { id: string; title: string } | null;

  return (
    <div className="mx-auto max-w-2xl pt-safe">
      <div className="px-2 pt-3 md:px-6">
        <Link href="/castigos" className="btn btn-ghost min-h-11 px-2">
          <CaretLeft size={20} aria-hidden />
          Castigos
        </Link>
      </div>
      <div className="space-y-5 px-4 pb-10 md:px-8">
        <header>
          <h1 className="title-large first-letter:uppercase">{p.title}</h1>
          <p className="footnote mt-2 flex flex-wrap items-center gap-2 text-ink-2">
            <span className="chip bg-bad-soft text-bad">Nivel {p.level}</span>
            {challenge.name}
            {p.parent_id ? " · por no cumplir el anterior" : ""}
          </p>
        </header>

        {p.status === "asignado" && <StartPanel punishment={p} plans={plans} />}
        {(p.status === "en_curso" || p.status === "cumplido") && (
          <ActiveSession
            punishment={p}
            logs={logs}
            challenge={challenge}
            bestSet={Number(bestRow?.amount ?? 0)}
            timezone={profile.timezone}
          />
        )}
        {p.status === "vencido" && (
          <section className="card p-5">
            <p className="flex items-center gap-2 headline text-bad">
              <XCircle size={22} weight="fill" aria-hidden />
              Vencido
            </p>
            <p className="footnote mt-1 text-ink-2">
              No se completó a tiempo ({p.progress} de {p.target}). Se generó un castigo más duro.
            </p>
            {child && (
              <Link href={`/castigos/${child.id}`} className="btn btn-danger mt-4">
                Ver: {child.title}
              </Link>
            )}
          </section>
        )}

        {p.status === "en_curso" && plans.length > 0 && (
          <section className="card p-5">
            <h2 className="title-2">Formas de completarlo</h2>
            <ul className="mt-3 space-y-2">
              {plans.map((plan) => (
                <li key={plan.label} className="rounded-control bg-surface-2 px-4 py-3">
                  <p className="footnote font-semibold">{plan.label}</p>
                  <p className="footnote text-ink-2">{plan.detail}</p>
                </li>
              ))}
            </ul>
          </section>
        )}

        <section className="card p-5">
          <h2 className="flex items-center gap-2 title-2">
            <Info size={20} aria-hidden />
            Qué cuenta
          </h2>
          <p className="footnote mt-2 text-pretty">{challenge.counts}</p>
          <ul className="mt-3 list-disc space-y-1.5 pl-5 footnote text-ink-2 marker:text-ink-3">
            {challenge.tips.map((tip) => (
              <li key={tip} className="text-pretty">
                {tip}
              </li>
            ))}
          </ul>
        </section>

        <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 caption text-ink-2">
          <dt>Asignado</dt>
          <dd>{formatDateTime(p.created_at, profile.timezone)}</dd>
          {p.started_at && (
            <>
              <dt>Empezado</dt>
              <dd>{formatDateTime(p.started_at, profile.timezone)}</dd>
            </>
          )}
          {p.completed_at && (
            <>
              <dt>Terminado</dt>
              <dd>{formatDateTime(p.completed_at, profile.timezone)}</dd>
            </>
          )}
        </dl>
      </div>
    </div>
  );
}
