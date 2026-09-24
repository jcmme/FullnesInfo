import Link from "next/link";
import { ArrowRight, CheckCircle, XCircle } from "@phosphor-icons/react/ssr";
import { ProgressBar } from "@/components/media";
import { PageHeader, Section } from "@/components/page-header";
import { Roulette } from "@/components/roulette";
import { formatCutoff, formatDayLong, formatStampShort, monthOf } from "@/lib/day";
import { formatNumber, formatRemaining } from "@/lib/format";
import { getSession } from "@/lib/session";
import type { Failure, Punishment } from "@/lib/types";

export const metadata = { title: "Castigos" };

export default async function PunishmentsPage() {
  const { supabase, userId, profile, now } = await getSession();
  const [failuresRes, activeRes, historyRes, freezesRes] = await Promise.all([
    supabase.from("failures").select("*").eq("user_id", userId).eq("status", "pendiente").order("day"),
    supabase.from("punishments").select("*").eq("user_id", userId).in("status", ["asignado", "en_curso"]).order("created_at"),
    supabase
      .from("punishments")
      .select("*")
      .eq("user_id", userId)
      .in("status", ["cumplido", "vencido"])
      .order("created_at", { ascending: false })
      .limit(30),
    supabase.from("freezes").select("day").eq("user_id", userId),
  ]);
  const failures = (failuresRes.data ?? []) as Failure[];
  const active = (activeRes.data ?? []) as Punishment[];
  const history = (historyRes.data ?? []) as Punishment[];
  const freezeDays = (freezesRes.data ?? []).map((f) => f.day as string);

  const current = failures[0];
  const usedInMonth = current ? freezeDays.filter((d) => monthOf(d) === monthOf(current.day)).length : 0;
  const canForgive = Boolean(current) && usedInMonth < profile.freezes_per_month;
  const paid = history.filter((p) => p.status === "cumplido").length;

  return (
    <>
      <PageHeader
        title="Castigos"
        subtitle={paid ? `${paid} ${paid === 1 ? "castigo pagado" : "castigos pagados"}` : "Lo que pasa cuando no cumples"}
      />

      {current && (
        <Section>
          <div className="card px-4 pb-6 pt-5 md:px-8">
            <h2 className="title-1 text-center text-balance">Fallaste el {formatDayLong(current.day)}</h2>
            {failures.length > 1 && (
              <p className="footnote mt-1 text-center font-semibold text-bad">Ruleta 1 de {failures.length}</p>
            )}
            <div className="mt-8">
              <Roulette
                key={current.id}
                failureId={current.id}
                level={current.level}
                canForgive={canForgive}
                remaining={failures.length}
              />
            </div>
          </div>
        </Section>
      )}

      {active.length > 0 && (
        <Section title="Por pagar">
          <ul className="space-y-3">
            {active.map((p) => {
              const deadline = p.status === "asignado" ? p.start_by : p.due_at;
              const left = deadline ? new Date(deadline).getTime() - now : 0;
              return (
                <li key={p.id}>
                  <Link href={`/castigos/${p.id}`} className="press card flex items-center gap-4 p-4">
                    <div className="min-w-0 flex-1">
                      <p className="headline first-letter:uppercase">{p.title}</p>
                      <p className="footnote mt-0.5 text-ink-2">
                        <span className="font-semibold text-bad">Nivel {p.level}.</span>{" "}
                        {p.status === "asignado"
                          ? `Sin empezar. Quedan ${formatRemaining(left)} para arrancar.`
                          : `${formatNumber(Number(p.progress), 1)} de ${formatNumber(Number(p.target))}. Quedan ${formatRemaining(left)}.`}
                      </p>
                      {p.status === "en_curso" && (
                        <div className="mt-2">
                          <ProgressBar value={Number(p.progress) / Number(p.target)} tone="bad" label="Avance" />
                        </div>
                      )}
                    </div>
                    <ArrowRight size={20} className="shrink-0 text-ink-3" aria-hidden />
                  </Link>
                </li>
              );
            })}
          </ul>
        </Section>
      )}

      {!current && active.length === 0 && (
        <Section>
          <div className="card p-6">
            <p className="flex items-center gap-2 headline text-ok">
              <CheckCircle size={22} weight="fill" aria-hidden />
              Sin deudas
            </p>
            <p className="footnote mt-1 max-w-[52ch] text-ink-2">Mientras registres cada día antes de las {formatCutoff(profile.cutoff_hour)}, esta pantalla se queda así.</p>
          </div>
        </Section>
      )}

      <Section title="Cómo funciona">
        <ol className="card list-decimal space-y-2 py-4 pl-9 pr-5 footnote text-ink-2 marker:font-semibold marker:text-ink">
          <li>Si un día cierra sin sumar {profile.min_words} palabras entre tus notas, te toca girar la ruleta. Si no la giras, en 24 h se gira sola.</li>
          <li>Cada día fallado seguido sube el nivel: más repeticiones o más kilómetros.</li>
          <li>Tienes 48 h para empezar un castigo. Al empezarlo corre su ventana (por ejemplo, 100 lagartijas en 4 h).</li>
          <li>Si no lo empiezas o no lo terminas a tiempo, aparece el mismo castigo un nivel más arriba.</li>
          <li>Con castigos o ruletas pendientes, la caja misteriosa se bloquea.</li>
        </ol>
      </Section>

      {history.length > 0 && (
        <Section title="Historial">
          <ul className="card divide-y hairline px-4">
            {history.map((p) => (
              <li key={p.id}>
                <Link href={`/castigos/${p.id}`} className="press flex items-center gap-3 py-3">
                  {p.status === "cumplido" ? (
                    <CheckCircle size={22} weight="fill" className="shrink-0 text-ok" aria-hidden />
                  ) : (
                    <XCircle size={22} weight="fill" className="shrink-0 text-bad" aria-hidden />
                  )}
                  <span className="min-w-0 flex-1 footnote first-letter:uppercase">{p.title}</span>
                  <span className="caption shrink-0 text-ink-2">
                    {formatStampShort(p.completed_at ?? p.created_at, profile.timezone)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </Section>
      )}
    </>
  );
}
