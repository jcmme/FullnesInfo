import type { SupabaseClient } from "@supabase/supabase-js";
import packsJson from "@/data/topic-packs.json";
import { fetchWithTimeout } from "./fetch";
import { AREAS, TOPICS } from "./mystery";
import type { Interest, MysteryTopic, TopicPack, WikiSummary } from "./types";

/**
 * Las fichas investigadas. Se importan solo desde componentes de servidor: este
 * archivo no debe acabar nunca en el JavaScript que baja tu teléfono.
 */
export const PACKS = packsJson as TopicPack[];

const PACK_BY_ID = new Map(PACKS.map((p) => [p.id, p]));

export const CUSTOM_PREFIX = "propio:";

export function getPack(key: string): TopicPack | undefined {
  return PACK_BY_ID.get(key);
}

export function isCustom(key: string): boolean {
  return key.startsWith(CUSTOM_PREFIX);
}

/** "Café de especialidad" -> "propio:cafe-de-especialidad". */
export function customKey(label: string): string {
  const slug = label
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  return CUSTOM_PREFIX + slug;
}

export function areaLabel(area: string): string {
  return AREAS[area] ?? "Tuyo";
}

/** Lo que se necesita para pintar una ficha, venga de donde venga. */
export type TopicView = {
  key: string;
  title: string;
  area: string;
  pack: TopicPack | null;
  catalog: MysteryTopic | null;
  /** Con qué se busca en YouTube, libros y Wikipedia. */
  query: string;
};

export function viewFor(interest: Pick<Interest, "key" | "label" | "area">): TopicView {
  const pack = getPack(interest.key) ?? null;
  const catalog = TOPICS.find((t) => t.id === interest.key) ?? null;
  return {
    key: interest.key,
    title: pack?.title ?? catalog?.title ?? interest.label,
    area: pack?.area ?? catalog?.area ?? interest.area,
    pack,
    catalog,
    query: pack?.searchQuery ?? catalog?.searchQuery ?? interest.label,
  };
}

/* Wikipedia: el respaldo gratis para los temas que todavía no investigo ----- */

const WIKI = "https://es.wikipedia.org";

type WikiPage = { title: string; extract?: string; fullurl?: string; thumbnail?: { source?: string } };

/** Un mes: Wikipedia no cambia tan rápido y así la ficha abre al instante. */
const WIKI_TTL_MS = 30 * 24 * 3_600_000;

/**
 * El resumen de un tema, primero de la caché y solo si no está (o ya envejeció)
 * de Wikipedia. Nunca tira la pantalla: si algo falla, devuelve null.
 */
export async function wikipediaFor(
  supabase: SupabaseClient,
  userId: string,
  key: string,
  query: string,
): Promise<WikiSummary | null> {
  const { data: hit } = await supabase
    .from("topic_cache")
    .select("payload, fetched_at")
    .eq("user_id", userId)
    .eq("key", key)
    .eq("kind", "wiki")
    .maybeSingle();

  const fresh = hit && Date.now() - new Date(hit.fetched_at).getTime() < WIKI_TTL_MS;
  if (fresh) return hit.payload as WikiSummary;

  const summary = await fetchWikipedia(query);
  if (!summary) return (hit?.payload as WikiSummary) ?? null;

  await supabase
    .from("topic_cache")
    .upsert(
      { user_id: userId, key, kind: "wiki", payload: summary, fetched_at: new Date().toISOString() },
      { onConflict: "user_id,key,kind" },
    );
  return summary;
}

/**
 * Resumen de Wikipedia en español, en una sola llamada. Antes eran dos seguidas
 * (buscar y luego traer el texto) y eso hacía esperar el doble. Si algo falla
 * devuelve null y la ficha se pinta igual, sin esta parte.
 */
export async function fetchWikipedia(query: string): Promise<WikiSummary | null> {
  const params = new URLSearchParams({
    action: "query",
    format: "json",
    formatversion: "2",
    generator: "search",
    gsrsearch: query,
    gsrlimit: "1",
    prop: "extracts|pageimages|info",
    exintro: "1",
    explaintext: "1",
    inprop: "url",
    pithumbsize: "400",
  });
  try {
    const res = await fetchWithTimeout(`${WIKI}/w/api.php?${params}`, "Wikipedia", {
      headers: { "User-Agent": "Fuellness/1.0 (uso personal)" },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { query?: { pages?: WikiPage[] } };
    const page = data.query?.pages?.[0];
    if (!page?.extract) return null;
    return {
      title: page.title,
      extract: page.extract.slice(0, 1200),
      url: page.fullurl ?? `${WIKI}/wiki/${encodeURIComponent(page.title)}`,
      thumbnail: page.thumbnail?.source ?? null,
    };
  } catch {
    return null;
  }
}
