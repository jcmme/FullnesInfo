import topicsJson from "@/data/mystery-topics.json";
import type { MysteryTopic, Rarity } from "./types";

export const TOPICS = topicsJson as MysteryTopic[];

export const AREAS: Record<string, string> = {
  historia: "Historia",
  ciencia: "Ciencia",
  psicologia: "Psicología",
  economia: "Economía",
  filosofia: "Filosofía",
  tecnologia: "Tecnología",
  cuerpo: "Cuerpo y salud",
  "modelos-mentales": "Modelos mentales",
  cultura: "Cultura",
  sociedad: "Sociedad",
};

export const RARITY_LABEL: Record<Rarity, string> = {
  comun: "Común",
  rara: "Rara",
  legendaria: "Legendaria",
};

const ODDS: [Rarity, number][] = [
  ["legendaria", 0.08],
  ["rara", 0.27],
  ["comun", 0.65],
];

export function getTopic(id: string): MysteryTopic | undefined {
  return TOPICS.find((t) => t.id === id);
}

/** Tira la rareza y elige un tema que no hayas visto, de tus áreas. Si ya viste todos, vuelve a empezar. */
export function drawTopic(seen: Set<string>, random = Math.random, from: MysteryTopic[] = TOPICS): MysteryTopic {
  let roll = random();
  let rarity: Rarity = "comun";
  for (const [r, p] of ODDS) {
    if (roll < p) {
      rarity = r;
      break;
    }
    roll -= p;
  }
  const base = from.length ? from : TOPICS;
  const unseen = base.filter((t) => !seen.has(t.id));
  const pool = unseen.length ? unseen : base;
  const sameRarity = pool.filter((t) => t.rarity === rarity);
  const candidates = sameRarity.length ? sameRarity : pool;
  return candidates[Math.floor(random() * candidates.length)];
}
