/**
 * Revisión de una nota. Son reglas puras sobre el texto: ni red ni base de datos,
 * así que guardar no se tarda nada más por esto.
 *
 * La regla de oro: solo se bloquea lo que es claramente relleno. Explicar algo con
 * tus palabras, sin repetir las del video, JAMÁS puede salir "basura": el castigo
 * por un error nuestro sería peor que la trampa que queremos evitar.
 */

export type Verdict = "ok" | "aviso" | "basura";

/** Motivos en clave; el texto que ves vive en la interfaz. */
export type ReviewReason = "repetida" | "sin-sentido" | "copiada-de-ti" | "fuera-de-tema" | "copiada-del-material";

export type Review = {
  verdict: Verdict;
  reasons: ReviewReason[];
  at: string;
  by: "reglas" | "claude";
};

export type ReviewInput = {
  note: string;
  /** Título, autor, capítulos, gancho del tema, preguntas: contra esto se compara. */
  material: string[];
  /** Las otras notas de hoy, para cachar copiar y pegar. */
  sameDayNotes?: string[];
};

const WORD = /[\p{L}\p{N}][\p{L}\p{N}'’-]*/gu;

/**
 * En español una de cada tres letras es vocal. "asdkjh" o "zxcvbn" traen una o
 * ninguna: eso es lo que separa un manazo en el teclado de una palabra de verdad.
 */
function looksLikeMash(word: string): boolean {
  if (word.length > 20) return true;
  if (word.length < 4 || /^\d+$/.test(word)) return false;
  const vowels = (word.match(/[aeiou]/g) ?? []).length;
  return vowels / word.length < 0.25;
}

/** Palabras que no dicen nada del tema: no cuentan para medir de qué hablas. */
const STOPWORDS = new Set(
  `el la los las un una unos unas de del al a y e o u ni que quien cual cuyo en con sin por para sobre tras entre hasta desde
   es son era eran fue fueron ser soy eres somos estan esta estas este estos esa esas ese esos aquel aquella lo le les se me te nos
   mi mis tu tus su sus nuestro nuestra yo el ella ellos ellas usted ustedes
   ha han habia hay haber hace hacer hizo hecho tiene tener tengo tenia puede poder pueden podria debe deber
   muy mas menos tan tanto poco mucho todo toda todos todas algo alguien nada nadie cada otro otra otros otras mismo misma
   pero aunque porque pues asi entonces tambien solo solamente ya no si sino cuando donde como cuanto
   ahora antes despues siempre nunca aqui alli ahi bien mal mejor peor
   me parecio gusto video libro nota tema parte cosa cosas manera forma vez veces ejemplo
   the of and to in that is for on with as it this you`
    .split(/\s+/)
    .filter(Boolean),
);

/** minúsculas, sin acentos y sin la "s" del plural: "cañones" y "canon" se parecen. */
function normalize(word: string): string {
  const base = word
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]/g, "");
  if (base.length > 5 && base.endsWith("es")) return base.slice(0, -2);
  if (base.length > 4 && base.endsWith("s")) return base.slice(0, -1);
  return base;
}

function tokens(text: string): string[] {
  return (text.match(WORD) ?? []).map(normalize).filter(Boolean);
}

/** Las palabras que sí hablan del tema. */
function contentTerms(text: string): Set<string> {
  return new Set(tokens(text).filter((w) => w.length >= 4 && !STOPWORDS.has(w)));
}

function ngrams(words: string[], size = 5): string[] {
  const out: string[] = [];
  for (let i = 0; i + size <= words.length; i++) out.push(words.slice(i, i + size).join(" "));
  return out;
}

/** Qué tanto de `a` ya estaba en `b`, de 0 a 1. */
function overlap(a: string[], b: Set<string>): number {
  if (!a.length) return 0;
  return a.filter((g) => b.has(g)).length / a.length;
}

/** Marcas de que un texto está en español, para no comparar contra un título en inglés. */
const SPANISH_MARKERS = ["de", "la", "el", "que", "y", "en", "los", "las", "un", "una", "por", "para", "con", "como", "es", "del", "su"];

function isSpanish(text: string): boolean {
  const raw = (text.toLowerCase().match(WORD) ?? []) as string[];
  let hits = 0;
  for (const w of raw) if (SPANISH_MARKERS.includes(w) && ++hits >= 2) return true;
  return false;
}

const MIN_WORDS_TO_JUDGE = 30;
const MIN_WORDS_FOR_DIVERSITY = 40;

export function reviewWithRules({ note, material, sameDayNotes = [] }: ReviewInput): Review {
  const at = new Date().toISOString();
  const words = tokens(note);
  const reasons: ReviewReason[] = [];
  const done = (verdict: Verdict): Review => ({ verdict, reasons, at, by: "reglas" });

  // Una nota corta no se juzga: para eso está el mínimo de palabras del día.
  if (words.length < MIN_WORDS_TO_JUDGE) return done("ok");

  // 1. Manazos en el teclado: "asdkjh zxcvbn qwerty".
  const gibberish = words.filter(looksLikeMash).length;
  if (gibberish / words.length > 0.3) {
    reasons.push("sin-sentido");
    return done("basura");
  }

  // 2. La misma palabra una y otra vez: "bien bien bien bien".
  const unique = new Set(words);
  if (words.length >= MIN_WORDS_FOR_DIVERSITY && unique.size / words.length < 0.35) {
    reasons.push("repetida");
    return done("basura");
  }

  // 3. La misma frase repetida a lo largo del texto.
  const grams = ngrams(words);
  if (grams.length >= 10 && 1 - new Set(grams).size / grams.length > 0.4) {
    reasons.push("repetida");
    return done("basura");
  }

  // 4. Copiada de otra nota tuya de hoy.
  for (const other of sameDayNotes) {
    const otherGrams = ngrams(tokens(other));
    if (otherGrams.length < 5) continue;
    if (overlap(grams, new Set(otherGrams)) > 0.9) {
      reasons.push("copiada-de-ti");
      return done("basura");
    }
  }

  // De aquí en adelante solo se avisa: la nota cuenta igual.
  const materialText = material.filter(Boolean).join(" ");
  const materialTerms = contentTerms(materialText);
  const noteTerms = contentTerms(note);

  // 5. Copiada del material en vez de explicada.
  const materialGrams = new Set(ngrams(tokens(materialText)));
  if (materialGrams.size >= 5 && overlap(grams, materialGrams) > 0.6) {
    reasons.push("copiada-del-material");
    return done("aviso");
  }

  // 6. Ni una sola palabra en común con lo que dijiste que viste. Solo cuando el
  // material está en español: si el video se titula en inglés y tú escribes en
  // español, no compartir palabras es lo normal, no una señal de nada.
  if (isSpanish(materialText) && materialTerms.size >= 3 && noteTerms.size >= 5) {
    let shared = 0;
    for (const term of noteTerms) if (materialTerms.has(term)) shared++;
    if (shared === 0) {
      reasons.push("fuera-de-tema");
      return done("aviso");
    }
  }

  return done("ok");
}

/**
 * La puerta por la que entra todo. Hoy son reglas; el día que exista
 * ANTHROPIC_API_KEY, Claude revisará aquí mismo, después de guardar, sin que
 * quien llama a esta función tenga que cambiar.
 */
export function reviewNote(input: ReviewInput): Review {
  return reviewWithRules(input);
}

/**
 * De una lista de datos o preguntas del tema, los que tu nota no tocó. Es lo que la
 * app te enseña después de guardar: contenido real que ya estaba escrito, no un
 * modelo opinando.
 */
export function notMentioned(note: string, candidates: string[], max = 2): string[] {
  const mine = contentTerms(note);
  const out: string[] = [];
  for (const candidate of candidates) {
    const terms = [...contentTerms(candidate)];
    if (terms.length < 3) continue;
    const shared = terms.filter((t) => mine.has(t)).length;
    if (shared / terms.length < 0.2) out.push(candidate);
    if (out.length >= max) break;
  }
  return out;
}

/** Arma el material contra el que se compara la nota. */
export function materialOf(parts: {
  title?: string | null;
  author?: string | null;
  chapters?: { title: string }[] | null;
  topic?: { title?: string; hook?: string; why?: string; questions?: string[]; terms?: string[] } | null;
}): string[] {
  const out: string[] = [];
  if (parts.title) out.push(parts.title);
  if (parts.author) out.push(parts.author);
  for (const c of parts.chapters ?? []) out.push(c.title);
  const t = parts.topic;
  if (t) {
    if (t.title) out.push(t.title);
    if (t.hook) out.push(t.hook);
    if (t.why) out.push(t.why);
    out.push(...(t.questions ?? []), ...(t.terms ?? []));
  }
  return out;
}
