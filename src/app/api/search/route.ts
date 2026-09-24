import { NextResponse, type NextRequest } from "next/server";
import { searchMedia, type SearchSource } from "@/lib/media";
import { createClient } from "@/lib/supabase/server";
import type { MediaResult } from "@/lib/types";

const SOURCES: SearchSource[] = ["youtube", "libro", "podcast"];

/**
 * Caché corta del servidor: repetir la misma búsqueda no vuelve a gastar cuota de
 * YouTube (100 unidades por búsqueda, 10,000 al día).
 */
const TTL_MS = 10 * 60_000;
const MAX_ENTRIES = 50;
const cache = new Map<string, { at: number; results: MediaResult[] }>();

function readCache(key: string): MediaResult[] | null {
  const hit = cache.get(key);
  if (!hit) return null;
  if (Date.now() - hit.at > TTL_MS) {
    cache.delete(key);
    return null;
  }
  return hit.results;
}

function writeCache(key: string, results: MediaResult[]) {
  cache.set(key, { at: Date.now(), results });
  if (cache.size > MAX_ENTRIES) {
    const oldest = cache.keys().next().value;
    if (oldest !== undefined) cache.delete(oldest);
  }
}

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims) return NextResponse.json({ error: "Inicia sesión." }, { status: 401 });

  const q = (request.nextUrl.searchParams.get("q") ?? "").trim().slice(0, 120);
  const source = (request.nextUrl.searchParams.get("source") ?? "youtube") as SearchSource;
  if (!SOURCES.includes(source)) return NextResponse.json({ error: "Fuente no válida." }, { status: 400 });
  if (q.length < 2) return NextResponse.json({ results: [] });

  const key = `${source}|${q.toLowerCase()}`;
  const hit = readCache(key);
  if (hit) return NextResponse.json({ results: hit });

  try {
    const results = await searchMedia(source, q);
    writeCache(key, results);
    return NextResponse.json({ results });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Falló la búsqueda." }, { status: 502 });
  }
}
