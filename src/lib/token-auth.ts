import type { NextRequest } from "next/server";
import { createAdminClient } from "./supabase/admin";
import type { Profile } from "./types";

/** Autenticación para Atajos de iOS: "Authorization: Bearer <token>" o ?token=. */
export async function profileFromToken(request: NextRequest) {
  const header = request.headers.get("authorization") ?? "";
  const token = header.replace(/^Bearer\s+/i, "").trim() || request.nextUrl.searchParams.get("token")?.trim() || "";
  if (token.length < 32) return null;
  const admin = createAdminClient();
  const { data } = await admin.from("profiles").select("*").eq("api_token", token).maybeSingle();
  return data ? { admin, profile: data as Profile } : null;
}
