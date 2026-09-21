import type { Punishment, PunishmentKind, PunishmentUnit } from "./types";

/**
 * Catálogo de castigos físicos. Nivel 1 es el castigo base; cada día fallado
 * seguido sube un nivel (máximo 4). Calibrado para ~25 lagartijas seguidas y
 * sin base de carrera: la distancia se puede caminar.
 */
export type Challenge = {
  id: string;
  name: string;
  kind: PunishmentKind;
  unit: PunishmentUnit;
  /** Serie cómoda sugerida (reps o segundos). */
  setSize?: number;
  levels: { target: number; windowHours?: number; days?: number }[];
  counts: string;
  tips: string[];
};

export const START_WINDOW_HOURS = 48;

export const CHALLENGES: Challenge[] = [
  {
    id: "lagartijas",
    name: "Lagartijas",
    kind: "ventana",
    unit: "reps",
    setSize: 15,
    levels: [
      { target: 100, windowHours: 4 },
      { target: 150, windowHours: 5 },
      { target: 200, windowHours: 6 },
      { target: 250, windowHours: 8 },
    ],
    counts: "Cuenta si el pecho baja a un puño del piso y extiendes los brazos completos.",
    tips: [
      "Deja 2 o 3 repeticiones en reserva por serie; llegar al fallo en la primera serie arruina las siguientes.",
      "Si la técnica se rompe, sube las manos a una mesa o escalón. Cuentan igual, pero anótalo.",
      "Pon una alarma cada 20 o 30 minutos y haz una serie en cuanto suene.",
    ],
  },
  {
    id: "sentadillas",
    name: "Sentadillas",
    kind: "ventana",
    unit: "reps",
    setSize: 30,
    levels: [
      { target: 150, windowHours: 4 },
      { target: 200, windowHours: 4 },
      { target: 300, windowHours: 6 },
      { target: 400, windowHours: 8 },
    ],
    counts: "Cuenta si la cadera baja al menos a la altura de las rodillas.",
    tips: [
      "Talones pegados al piso y rodillas en la dirección de los pies.",
      "Alterna con otra actividad: una serie cada vez que te levantes por agua.",
    ],
  },
  {
    id: "burpees",
    name: "Burpees",
    kind: "ventana",
    unit: "reps",
    setSize: 10,
    levels: [
      { target: 50, windowHours: 3 },
      { target: 75, windowHours: 4 },
      { target: 100, windowHours: 5 },
      { target: 150, windowHours: 6 },
    ],
    counts: "Pecho al piso, de pie y un salto con las manos arriba.",
    tips: [
      "Series cortas con buena técnica rinden más que una serie larga y fea.",
      "Si te falta el aire, camina 2 minutos entre series en lugar de sentarte.",
    ],
  },
  {
    id: "plancha",
    name: "Plancha",
    kind: "ventana",
    unit: "seg",
    setSize: 45,
    levels: [
      { target: 300, windowHours: 12 },
      { target: 480, windowHours: 12 },
      { target: 600, windowHours: 12 },
      { target: 900, windowHours: 12 },
    ],
    counts: "Antebrazos y puntas de los pies; cadera alineada, sin hundirse ni levantarse.",
    tips: [
      "Aprieta glúteos y abdomen como si te fueran a dar un golpe.",
      "Corta la serie cuando la cadera empiece a caer. Solo cuentan los segundos limpios.",
    ],
  },
  {
    id: "abdominales",
    name: "Abdominales",
    kind: "ventana",
    unit: "reps",
    setSize: 25,
    levels: [
      { target: 150, windowHours: 4 },
      { target: 200, windowHours: 4 },
      { target: 300, windowHours: 6 },
      { target: 400, windowHours: 8 },
    ],
    counts: "Crunch completo: los omóplatos se despegan del piso.",
    tips: ["No jales el cuello con las manos; mira al techo.", "Exhala al subir."],
  },
  {
    id: "zancadas",
    name: "Zancadas",
    kind: "ventana",
    unit: "reps",
    setSize: 20,
    levels: [
      { target: 100, windowHours: 4 },
      { target: 150, windowHours: 5 },
      { target: 200, windowHours: 6 },
      { target: 300, windowHours: 8 },
    ],
    counts: "Cada pierna cuenta por separado. La rodilla de atrás casi toca el piso.",
    tips: ["Alterna piernas en cada repetición para no cargar una sola.", "Torso derecho, paso largo."],
  },
  {
    id: "fondos",
    name: "Fondos en silla",
    kind: "ventana",
    unit: "reps",
    setSize: 15,
    levels: [
      { target: 75, windowHours: 4 },
      { target: 100, windowHours: 4 },
      { target: 150, windowHours: 6 },
      { target: 200, windowHours: 8 },
    ],
    counts: "Codos a 90 grados en la bajada; brazos extendidos arriba.",
    tips: ["Usa una silla que no se deslice, pegada a la pared.", "Piernas dobladas si es muy difícil; estiradas para subir la dificultad."],
  },
  {
    id: "distancia",
    name: "Distancia",
    kind: "dias",
    unit: "km",
    levels: [
      { target: 10, days: 4 },
      { target: 15, days: 5 },
      { target: 21, days: 6 },
      { target: 30, days: 5 },
    ],
    counts: "Caminando o trotando. Anota los km que marque tu iPhone o Apple Watch (app Fitness o Salud).",
    tips: [
      "Caminando rápido, 1 km toma entre 10 y 12 minutos.",
      "Para empezar a trotar: 1 minuto trotando, 2 caminando. Repite.",
      "Reparte parejo: es más fácil 3 km diarios que 12 el último día.",
    ],
  },
];

export function getChallenge(id: string): Challenge | undefined {
  return CHALLENGES.find((c) => c.id === id);
}

export function clampLevel(level: number): number {
  return Math.min(4, Math.max(1, Math.round(level)));
}

export function describeTarget(challenge: Challenge, target: number, level: number): string {
  const spec = challenge.levels[clampLevel(level) - 1];
  if (challenge.unit === "km") return `${target} km en ${spec.days} días`;
  if (challenge.unit === "seg") {
    const min = Math.round((target / 60) * 10) / 10;
    return `${min} min de ${challenge.name.toLowerCase()} en ${spec.windowHours} h`;
  }
  return `${target} ${challenge.name.toLowerCase()} en ${spec.windowHours} h`;
}

/** Lo que se inserta en la tabla punishments para un reto y nivel. */
export function buildPunishment(challenge: Challenge, level: number, now: Date, overrideTarget?: number) {
  const lvl = clampLevel(level);
  const spec = challenge.levels[lvl - 1];
  const target = overrideTarget ?? spec.target;
  const base = {
    challenge_id: challenge.id,
    kind: challenge.kind,
    title: describeTarget(challenge, target, lvl),
    level: lvl,
    target,
    unit: challenge.unit,
  };
  if (challenge.kind === "dias") {
    const due = new Date(now.getTime() + (spec.days ?? 5) * 86_400_000);
    return {
      ...base,
      days: spec.days ?? 5,
      window_hours: null,
      status: "en_curso" as const,
      start_by: now.toISOString(),
      started_at: now.toISOString(),
      due_at: due.toISOString(),
    };
  }
  return {
    ...base,
    days: null,
    window_hours: spec.windowHours ?? 4,
    status: "asignado" as const,
    start_by: new Date(now.getTime() + START_WINDOW_HOURS * 3_600_000).toISOString(),
    started_at: null,
    due_at: null,
  };
}

/** Castigo por no cumplir un castigo: mismo reto, un nivel arriba (o +25% si ya estaba en 4). */
export function escalate(p: Punishment, now: Date) {
  const challenge = getChallenge(p.challenge_id) ?? CHALLENGES[0];
  if (p.level >= 4) {
    const bumped = challenge.unit === "km" ? Math.ceil(p.target * 1.25) : Math.ceil((p.target * 1.25) / 5) * 5;
    return buildPunishment(challenge, 4, now, bumped);
  }
  return buildPunishment(challenge, p.level + 1, now);
}

export function pickChallenge(random = Math.random): Challenge {
  return CHALLENGES[Math.floor(random() * CHALLENGES.length)];
}

export type PlanSuggestion = { label: string; detail: string };

/** Formas concretas de completar el castigo dentro de su ventana. */
export function suggestPlans(p: Pick<Punishment, "challenge_id" | "target" | "unit" | "window_hours" | "days">): PlanSuggestion[] {
  const challenge = getChallenge(p.challenge_id);
  if (!challenge) return [];

  if (p.unit === "km") {
    const days = p.days ?? 5;
    const perDay = Math.ceil((p.target / days) * 10) / 10;
    const minutes = Math.round(perDay * 11);
    return [
      { label: "Parejo", detail: `${perDay} km diarios, unos ${minutes} min caminando rápido.` },
      { label: "Intervalos", detail: "1 min trotando y 2 caminando; cada día agrega 1 minuto de trote." },
    ];
  }

  const windowMin = (p.window_hours ?? 4) * 60;
  const set = challenge.setSize ?? 10;
  const sets = Math.ceil(p.target / set);
  const every = Math.max(5, Math.floor((windowMin * 0.8) / sets / 5) * 5);
  const unitWord = p.unit === "seg" ? "s" : "";
  const plans: PlanSuggestion[] = [
    {
      label: "Series fijas",
      detail: `${sets} series de ${set}${unitWord} cada ${every} min. Terminas con margen.`,
    },
  ];

  if (p.unit === "reps") {
    const emomSet = Math.max(5, Math.round(set * 0.6));
    const emomRounds = Math.ceil(p.target / emomSet);
    plans.push({
      label: "Cada 10 min",
      detail: `Al inicio de cada bloque de 10 min haz ${emomSet}. Son ${emomRounds} bloques (${Math.round((emomRounds * 10) / 6) / 10} h).`,
    });
    const peak = Math.round(set * 1.2);
    const step = Math.max(2, Math.round(peak / 4));
    const pyramid: number[] = [];
    for (let r = step; r < peak; r += step) pyramid.push(r);
    pyramid.push(peak);
    const up = pyramid.reduce((a, b) => a + b, 0);
    const full = up * 2 - peak;
    const rounds = Math.max(1, Math.ceil(p.target / full));
    plans.push({
      label: "Pirámide",
      detail: `${pyramid.join(", ")} y de regreso. ${rounds > 1 ? `Repite ${rounds} veces.` : "Una vuelta completa."}`,
    });
  }
  return plans;
}
