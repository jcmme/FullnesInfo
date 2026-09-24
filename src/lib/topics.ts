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
    .replace(/[̀-ͯ]/g, "")
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

type WikiSearch = { pages?: { key: string; title: string; description?: string | null }[] };
type WikiPage = { title: string; extract?: string; content_urls?: { desktop?: { page?: string } }; thumbnail?: { source?: string } };

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

/** Resumen de Wikipedia en español. Devuelve null si no hay nada decente. */
export async function fetchWikipedia(query: string): Promise<WikiSummary | null> {
  try {
    const res = await fetchWithTimeout(
      `${WIKI}/w/rest.php/v1/search/page?q=${encodeURIComponent(query)}&limit=1`,
      "Wikipedia",
      { headers: { "User-Agent": "Fuellness/1.0 (uso personal)" } },
    );
    if (!res.ok) return null;
    const found = (await res.json()) as WikiSearch;
    const first = found.pages?.[0];
    if (!first) return null;

    const page = await fetchWithTimeout(
      `${WIKI}/api/rest_v1/page/summary/${encodeURIComponent(first.key)}`,
      "Wikipedia",
      { headers: { "User-Agent": "Fuellness/1.0 (uso personal)" } },
    );
    if (!page.ok) return null;
    const data = (await page.json()) as WikiPage;
    if (!data.extract) return null;
    return {
      title: data.title,
      extract: data.extract,
      url: data.content_urls?.desktop?.page ?? `${WIKI}/wiki/${encodeURIComponent(first.key)}`,
      thumbnail: data.thumbnail?.source ?? null,
    };
  } catch {
    // Sin internet o Wikipedia caída: la ficha se pinta igual, sin esta parte.
    return null;
  }
}
