import { NextResponse, type NextRequest } from "next/server";
import { searchMedia, type SearchSource } from "@/lib/media";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims) return NextResponse.json({ error: "Inicia sesión." }, { status: 401 });

  const q = request.nextUrl.searchParams.get("q")?.trim() ?? "";
  const source = (request.nextUrl.searchParams.get("source") ?? "youtube") as SearchSource;
  if (q.length < 2) return NextResponse.json({ results: [] });
  if (!["youtube", "libro", "podcast"].includes(source)) {
    return NextResponse.json({ error: "Fuente no válida." }, { status: 400 });
  }

  try {
    const results = await searchMedia(source, q);
    return NextResponse.json({ results });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Falló la búsqueda." }, { status: 502 });
  }
}
