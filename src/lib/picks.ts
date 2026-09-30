import type { TopicFact, TopicPack } from "./types";

/**
 * Lo que se elige del paquete de fichas, sin tocar el paquete. Vive aparte para
 * poder probarlo con node: este archivo no importa JSON ni nada del servidor.
 */

/** El catálogo viejo usaba otros nombres de área; aquí se traducen. */
const FROM_OLD: Record<string, string> = {
  psicologia: "mente",
  economia: "dinero",
  "modelos-mentales": "modelos",
};

export const areaOf = (topic: { area: string }): string => FROM_OLD[topic.area] ?? topic.area;

/** Número estable a partir de un texto. Misma entrada, mismo número, siempre. */
export function hash(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  return Math.abs(h);
}

export type PickedFact = TopicFact & { topicKey: string; topicTitle: string };
export type QuizOption = { key: string; title: string };
export type QuizRound = { fact: TopicFact; answer: string; options: QuizOption[] };

/** De dónde salen los datos del día: tus temas, si no tus áreas, si no todo. */
function poolFor(packs: TopicPack[], keys: string[], areas: string[], minimo: number): TopicPack[] {
  const conDatos = packs.filter((p) => p.facts.length > 0);
  const mios = conDatos.filter((p) => keys.includes(p.id));
  if (mios.length >= minimo) return mios;
  const porArea = conDatos.filter((p) => areas.includes(areaOf(p)));
  return porArea.length >= minimo ? porArea : conDatos;
}

/**
 * Datos curiosos del día. Uno por tema para que no se repita el mismo asunto, y
 * con semilla del día: cambian mañana, no en cada render.
 */
export function pickFacts(packs: TopicPack[], keys: string[], areas: string[], day: string, max = 3): PickedFact[] {
  return poolFor(packs, keys, areas, 1)
    .map((p) => ({ p, n: hash(day + p.id) }))
    .sort((a, b) => a.n - b.n)
    .slice(0, max)
    .map(({ p, n }) => ({ ...p.facts[n % p.facts.length], topicKey: p.id, topicTitle: p.title }));
}

/**
 * El reto del día: un dato y tres fichas para adivinar de cuál salió. Los dos
 * distractores salen de otras fichas, elegidos con la misma semilla.
 */
export function pickChallenge(packs: TopicPack[], keys: string[], areas: string[], day: string, rounds = 3): QuizRound[] {
  const conDatos = packs.filter((p) => p.facts.length > 0);
  if (conDatos.length < 3) return [];

  return poolFor(packs, keys, areas, rounds)
    .map((p) => ({ p, n: hash(day + "reto" + p.id) }))
    .sort((a, b) => a.n - b.n)
    .slice(0, rounds)
    .map(({ p, n }) => {
      const distractores = conDatos
        .filter((o) => o.id !== p.id)
        .map((o) => ({ o, n: hash(day + p.id + o.id) }))
        .sort((a, b) => a.n - b.n)
        .slice(0, 2)
        .map(({ o }) => o);
      const options = [p, ...distractores]
        .map((o) => ({ key: o.id, title: o.title }))
        .sort((a, b) => hash(day + "op" + p.id + a.key) - hash(day + "op" + p.id + b.key));
      return { fact: p.facts[n % p.facts.length], answer: p.id, options };
    });
}
