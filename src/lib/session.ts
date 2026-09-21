import { cache } from "react";
import { getProfile, syncState } from "./engine";
import { requireUser } from "./supabase/server";

/** Una sola evaluación por request, compartida entre layout y página. */
export const getSession = cache(async () => {
  const { supabase, userId } = await requireUser();
  const profile = await getProfile(supabase, userId);
  const now = Date.now();
  await syncState(supabase, profile, new Date(now));
  return { supabase, userId, profile, now };
});
