import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ArrowSquareOut, CaretLeft, PencilSimple } from "@phosphor-icons/react/ssr";
import { Recommendation, TopicSearch } from "@/components/topic-sheet";
import { getSession } from "@/lib/session";
import { areaLabelOf } from "@/lib/areas";
import { viewFor, wikipediaFor } from "@/lib/topics";
import type { Interest } from "@/lib/types";

export const metadata = { title: "Tema" };

/** El resumen de Wikipedia llega aparte: la ficha ya se pintó completa sin él. */
async function FromWikipedia({ topicKey, query }: { topicKey: string; query: string }) {
  const { supabase, userId } = await getSession();
  const wiki = await wikipediaFor(supabase, userId, topicKey, query);
  if (!wiki) {
    return (
      <p className="footnote text-ink-2">
        No encontré un resumen de este tema. Búscalo abajo y guarda lo que te sirva.
      </p>
    );
  }
  return (
    <div className="card p-5">
      <p className="text-pretty">{wiki.extract}</p>
      <a
        href={wiki.url}
        target="_blank"
        rel="noreferrer"
        className="press mt-2 flex min-h-11 items-center gap-1.5 footnote font-semibold text-tint-ink"
      >
        Leerlo completo en Wikipedia
        <ArrowSquareOut size={14} aria-hidden />
      </a>
    </div>
  );
}

function WikiSkeleton() {
  return (
    <div className="card space-y-2.5 p-5" aria-hidden>
      <div className="h-3.5 w-full rounded-full bg-surface-2" />
      <div className="h-3.5 w-11/12 rounded-full bg-surface-2" />
      <div className="h-3.5 w-9/12 rounded-full bg-surface-2" />
    </div>
  );
}

export default async function TopicPage({ params }: { params: Promise<{ key: string }> }) {
  const { key: raw } = await params;
  const key = decodeURIComponent(raw);
  const { supabase, userId } = await getSession();

  const { data } = await supabase.from("interests").select("*").eq("user_id", userId).eq("key", key).maybeSingle();
  const interest = data as Interest | null;
  const view = viewFor(interest ?? { key, label: key.replace(/^propio:/, "").replace(/-/g, " "), area: "propio" });
  if (!interest && !view.pack && !view.catalog) notFound();

  const { pack, catalog } = view;
  const questions = pack?.questions ?? catalog?.questions ?? [];

  return (
    <div className="mx-auto max-w-2xl pt-safe">
      <div className="px-2 pt-3 md:px-6">
        <Link href="/descubrir" className="btn btn-ghost min-h-11 px-2">
          <CaretLeft size={20} aria-hidden />
          Descubrir
        </Link>
      </div>

      <div className="space-y-8 px-4 pb-4 md:px-8">
        <header>
          <p className="footnote text-tint-ink">{areaLabelOf(view.area)}</p>
          <h1 className="title-large mt-0.5 text-balance">{view.title}</h1>
          {pack ? (
            <>
              <p className="mt-3 text-pretty">{pack.summary}</p>
              <p className="footnote mt-2 text-pretty text-ink-2">{pack.why}</p>
            </>
          ) : catalog ? (
            <>
              <p className="mt-3 text-pretty">{catalog.hook}</p>
              <p className="footnote mt-2 text-pretty text-ink-2">{catalog.why}</p>
            </>
          ) : null}
        </header>

        {!pack && (
          <section>
            <h2 className="label">Qué es</h2>
            <Suspense fallback={<WikiSkeleton />}>
              <FromWikipedia topicKey={key} query={view.query} />
            </Suspense>
            <p className="caption mt-2 text-ink-2">
              Este tema todavía no lo investigo a fondo. Lo de arriba viene de Wikipedia, tal cual.
            </p>
          </section>
        )}

        {pack && pack.facts.length > 0 && (
          <section>
            <h2 className="label">Datos curiosos</h2>
            <ul className="space-y-3">
              {pack.facts.map((f, i) => (
                <li key={i} className="card p-4">
                  <p className="text-pretty">{f.text}</p>
                  <a
                    href={f.source.url}
                    target="_blank"
                    rel="noreferrer"
                    className="press mt-2 inline-flex items-center gap-1.5 caption font-semibold text-ink-2"
                  >
                    {f.source.title}
                    <ArrowSquareOut size={12} aria-hidden />
                  </a>
                </li>
              ))}
            </ul>
          </section>
        )}

        {pack && pack.timeline.length > 0 && (
          <section>
            <h2 className="label">Cómo llegamos aquí</h2>
            <ol className="card divide-y hairline px-4">
              {pack.timeline.map((m, i) => (
                <li key={i} className="flex gap-4 py-3">
                  <span className="numeral w-16 shrink-0 text-[1.0625rem] text-tint-ink tabular">{m.year}</span>
                  <span className="footnote text-pretty">{m.text}</span>
                </li>
              ))}
            </ol>
          </section>
        )}

        {pack && pack.terms.length > 0 && (
          <section>
            <h2 className="label">Palabras que vas a oír</h2>
            <dl className="card divide-y hairline px-4">
              {pack.terms.map((t, i) => (
                <div key={i} className="py-3">
                  <dt className="footnote font-semibold">{t.term}</dt>
                  <dd className="footnote mt-0.5 text-pretty text-ink-2">{t.meaning}</dd>
                </div>
              ))}
            </dl>
          </section>
        )}

        {pack && (
          <section>
            <h2 className="label">Por dónde seguir</h2>
            <ul className="space-y-3">
              {pack.recommendations.videos.map((l) => (
                <Recommendation key={l.url} link={l} kind="video" topicTitle={view.title} />
              ))}
              {pack.recommendations.books.map((l) => (
                <Recommendation key={l.url} link={l} kind="libro" topicTitle={view.title} />
              ))}
              {pack.recommendations.articles.map((l) => (
                <Recommendation key={l.url} link={l} kind="articulo" topicTitle={view.title} />
              ))}
            </ul>
          </section>
        )}

        <section className="space-y-3">
          <TopicSearch query={view.query} title={view.title} />
          <Link href={`/registrar?tema=${encodeURIComponent(key)}`} className="btn btn-primary btn-lg w-full">
            <PencilSimple size={20} aria-hidden />
            Escribir sobre esto
          </Link>
          {questions.length > 0 && (
            <div className="rounded-card bg-surface p-4">
              <p className="label">Para arrancar</p>
              <ul className="space-y-1.5">
                {questions.map((q, i) => (
                  <li key={i} className="footnote text-pretty text-ink-2">
                    {q}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
