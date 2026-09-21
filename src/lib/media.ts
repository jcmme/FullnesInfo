import type { Chapter, MediaResult } from "./types";

/* YouTube ----------------------------------------------------------------- */

const YT_API = "https://www.googleapis.com/youtube/v3";

export function hasYouTubeKey(): boolean {
  return Boolean(process.env.YOUTUBE_API_KEY);
}

export function extractYouTubeId(input: string): string | null {
  try {
    const url = new URL(input.trim());
    const host = url.hostname.replace(/^www\.|^m\./, "");
    if (host === "youtu.be") return url.pathname.slice(1, 12) || null;
    if (host === "youtube.com" || host === "music.youtube.com") {
      const v = url.searchParams.get("v");
      if (v) return v;
      const match = url.pathname.match(/^\/(?:shorts|embed|live)\/([\w-]{11})/);
      return match?.[1] ?? null;
    }
  } catch {
    // no es URL
  }
  return null;
}

export function parseIsoDuration(iso: string | undefined): number | null {
  if (!iso) return null;
  const m = iso.match(/^P(?:(\d+)D)?T?(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/);
  if (!m) return null;
  const [, d, h, min, s] = m.map((x) => Number(x ?? 0));
  return d * 86400 + h * 3600 + min * 60 + s;
}

const TIMESTAMP_LINE =
  /^\s*(?:[-•*▶►]\s*)?[([]?((?:\d{1,2}:)?\d{1,2}:\d{2})[)\]]?\s*(?:[-–—:|]\s*)?(.{2,120})$/;

/** Capítulos a partir de la descripción ("0:00 Intro", "(12:34) Tema"). */
export function parseChapters(description: string): Chapter[] {
  const chapters: Chapter[] = [];
  for (const line of description.split(/\r?\n/)) {
    const m = line.match(TIMESTAMP_LINE);
    if (!m) continue;
    const start = m[1].split(":").reduce((acc, n) => acc * 60 + Number(n), 0);
    const title = m[2].replace(/^[-–—:|\s]+/, "").trim();
    if (!title) continue;
    if (chapters.length && start <= chapters[chapters.length - 1].start) continue;
    chapters.push({ start, title });
  }
  return chapters.length >= 3 ? chapters : [];
}

function decodeEntities(text: string): string {
  return text
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

type YtVideo = {
  id: string;
  snippet: {
    title: string;
    channelTitle: string;
    description: string;
    publishedAt: string;
    thumbnails: Record<string, { url: string } | undefined>;
  };
  contentDetails: { duration: string };
};

async function ytFetch<T>(path: string, params: Record<string, string>): Promise<T> {
  const key = process.env.YOUTUBE_API_KEY;
  if (!key) throw new Error("Falta YOUTUBE_API_KEY en las variables de entorno.");
  const qs = new URLSearchParams({ ...params, key });
  const res = await fetch(`${YT_API}/${path}?${qs}`, { cache: "no-store" });
  if (!res.ok) {
    const body = await res.text();
    if (res.status === 403 && body.includes("quota")) {
      throw new Error("Se acabó la cuota diaria de YouTube. Se renueva a medianoche (hora del Pacífico).");
    }
    throw new Error(`YouTube respondió ${res.status}.`);
  }
  return res.json() as Promise<T>;
}

function toResult(v: YtVideo): MediaResult {
  const t = v.snippet.thumbnails;
  return {
    provider: "youtube",
    id: v.id,
    title: decodeEntities(v.snippet.title),
    author: decodeEntities(v.snippet.channelTitle),
    url: `https://www.youtube.com/watch?v=${v.id}`,
    thumbnail: (t.maxres ?? t.standard ?? t.high ?? t.medium ?? t.default)?.url ?? null,
    durationSeconds: parseIsoDuration(v.contentDetails.duration),
    totalPages: null,
    published: v.snippet.publishedAt,
  };
}

export async function getYouTubeVideos(ids: string[]): Promise<{ result: MediaResult; chapters: Chapter[] }[]> {
  if (!ids.length) return [];
  const data = await ytFetch<{ items: YtVideo[] }>("videos", {
    part: "snippet,contentDetails",
    id: ids.join(","),
  });
  const byId = new Map(data.items.map((v) => [v.id, v]));
  return ids
    .map((id) => byId.get(id))
    .filter((v): v is YtVideo => Boolean(v))
    .map((v) => ({ result: toResult(v), chapters: parseChapters(v.snippet.description) }));
}

/** Hasta 3 minutos se considera clip o Short. */
const CLIP_MAX_SECONDS = 180;

/** Busca videos largos primero: el objetivo es encontrar el original, no otro clip. */
export async function searchYouTube(query: string, max = 8): Promise<MediaResult[]> {
  const direct = extractYouTubeId(query);
  if (direct) return (await getYouTubeVideos([direct])).map((v) => v.result);

  const search = await ytFetch<{ items: { id: { videoId?: string } }[] }>("search", {
    part: "snippet",
    type: "video",
    maxResults: String(max),
    q: query,
  });
  const ids = search.items.map((i) => i.id.videoId).filter((id): id is string => Boolean(id));
  const results = (await getYouTubeVideos(ids)).map((v) => v.result);
  // Mantiene el orden de relevancia, pero los clips cortos van al final.
  const isClip = (r: MediaResult) => r.durationSeconds !== null && r.durationSeconds <= CLIP_MAX_SECONDS;
  return [...results.filter((r) => !isClip(r)), ...results.filter(isClip)];
}

/* Libros: Open Library (sin llave) ---------------------------------------- */

type OlDoc = {
  key: string;
  title: string;
  author_name?: string[];
  cover_i?: number;
  first_publish_year?: number;
  number_of_pages_median?: number;
};

export async function searchBooks(query: string, max = 8): Promise<MediaResult[]> {
  const qs = new URLSearchParams({
    q: query,
    limit: String(max),
    fields: "key,title,author_name,cover_i,first_publish_year,number_of_pages_median",
  });
  const res = await fetch(`https://openlibrary.org/search.json?${qs}`, {
    headers: { "User-Agent": "FullnesInfo/1.0 (uso personal)" },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Open Library respondió ${res.status}.`);
  const data = (await res.json()) as { docs: OlDoc[] };
  return data.docs.map((d) => ({
    provider: "openlibrary" as const,
    id: d.key,
    title: d.title,
    author: d.author_name?.slice(0, 2).join(", ") ?? null,
    url: `https://openlibrary.org${d.key}`,
    thumbnail: d.cover_i ? `https://covers.openlibrary.org/b/id/${d.cover_i}-L.jpg` : null,
    durationSeconds: null,
    totalPages: d.number_of_pages_median ?? null,
    published: d.first_publish_year ? String(d.first_publish_year) : null,
  }));
}

/* Podcasts: catálogo de Apple Podcasts (sin llave) ------------------------- */

type ItunesEpisode = {
  trackId: number;
  trackName: string;
  collectionName?: string;
  artworkUrl600?: string;
  artworkUrl160?: string;
  trackTimeMillis?: number;
  trackViewUrl: string;
  releaseDate?: string;
};

export async function searchPodcasts(query: string, max = 8): Promise<MediaResult[]> {
  const qs = new URLSearchParams({
    term: query,
    media: "podcast",
    entity: "podcastEpisode",
    limit: String(max),
    country: "MX",
  });
  const res = await fetch(`https://itunes.apple.com/search?${qs}`, { cache: "no-store" });
  if (!res.ok) throw new Error(`Apple Podcasts respondió ${res.status}.`);
  const data = (await res.json()) as { results: ItunesEpisode[] };
  return data.results.map((e) => ({
    provider: "itunes" as const,
    id: String(e.trackId),
    title: e.trackName,
    author: e.collectionName ?? null,
    url: e.trackViewUrl,
    thumbnail: e.artworkUrl600 ?? e.artworkUrl160 ?? null,
    durationSeconds: e.trackTimeMillis ? Math.round(e.trackTimeMillis / 1000) : null,
    totalPages: null,
    published: e.releaseDate ?? null,
  }));
}

export type SearchSource = "youtube" | "libro" | "podcast";

export async function searchMedia(source: SearchSource, query: string): Promise<MediaResult[]> {
  if (source === "libro") return searchBooks(query);
  if (source === "podcast") return searchPodcasts(query);
  return searchYouTube(query);
}

export function detectOrigin(url: string | null | undefined) {
  if (!url) return null;
  try {
    const host = new URL(url).hostname.replace(/^www\./, "");
    if (host.includes("instagram.com")) return "instagram" as const;
    if (host.includes("tiktok.com")) return "tiktok" as const;
    if (host.includes("youtube.com") || host === "youtu.be") return "youtube" as const;
    if (host.includes("threads.net") || host.includes("threads.com")) return "threads" as const;
    if (host === "x.com" || host.includes("twitter.com")) return "x" as const;
    return "web" as const;
  } catch {
    return null;
  }
}
