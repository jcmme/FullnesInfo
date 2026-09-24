import { TOPICS } from "./mystery";
import type { MysteryTopic } from "./types";

/**
 * Las áreas son lo único que eliges. Los temas específicos llegan solos, de
 * sorpresa, sacados de las áreas que dijiste que te laten.
 */
export type Area = { id: string; label: string; hint: string };

export const AREA_LIST: Area[] = [
  { id: "historia", label: "Historia", hint: "Imperios, rutas y caídas que explican hoy" },
  { id: "ciencia", label: "Ciencia", hint: "Cómo funcionan las cosas por dentro" },
  { id: "espacio", label: "Espacio", hint: "El universo y lo que no sabemos de él" },
  { id: "naturaleza", label: "Naturaleza", hint: "Animales, océanos, clima" },
  { id: "mente", label: "Mente", hint: "Psicología, sesgos, emociones, sueño" },
  { id: "cuerpo", label: "Cuerpo", hint: "Salud, ejercicio, longevidad" },
  { id: "comida", label: "Comida", hint: "De dónde sale y qué te hace" },
  { id: "dinero", label: "Dinero", hint: "Economía, crisis, tus finanzas" },
  { id: "trabajo", label: "Trabajo", hint: "Oficios, empresas, cómo se hacen las cosas" },
  { id: "tecnologia", label: "Tecnología", hint: "Internet, chips, la infraestructura invisible" },
  { id: "filosofia", label: "Filosofía", hint: "Las preguntas viejas que siguen abiertas" },
  { id: "modelos", label: "Modelos mentales", hint: "Herramientas para pensar y decidir" },
  { id: "sociedad", label: "Sociedad", hint: "Poder, ciudades, cómo vivimos juntos" },
  { id: "cultura", label: "Cultura", hint: "Arte, música, cine, libros" },
  { id: "deporte", label: "Deporte", hint: "El cuerpo al límite y la estrategia" },
  { id: "misterios", label: "Misterios", hint: "Lo que nadie ha resuelto" },
];

/** El catálogo viejo usaba otros nombres de área; aquí se traducen. */
const FROM_OLD: Record<string, string> = {
  psicologia: "mente",
  economia: "dinero",
  "modelos-mentales": "modelos",
};

export const areaOf = (topic: { area: string }): string => FROM_OLD[topic.area] ?? topic.area;

export const areaLabelOf = (id: string): string => AREA_LIST.find((a) => a.id === id)?.label ?? "Tuyo";

/** Cuántos temas hay hoy por área: las vacías se muestran como "pronto". */
export function topicCounts(): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const t of TOPICS) counts[areaOf(t)] = (counts[areaOf(t)] ?? 0) + 1;
  return counts;
}

/**
 * Los siguientes temas sorpresa: de tus áreas, sin repetir los que ya viste ni
 * los que pasaste. Mezclados para que no salgan siempre en el mismo orden.
 */
export function surprisesFor(areas: string[], seen: Set<string>, max = 12): MysteryTopic[] {
  const pool = TOPICS.filter((t) => !seen.has(t.id) && (areas.length === 0 || areas.includes(areaOf(t))));
  const out = [...pool];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out.slice(0, max);
}
