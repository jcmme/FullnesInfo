"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/supabase/server";

export type SettingsState = { error?: string; ok?: boolean } | undefined;

export async function updateSettings(_prev: SettingsState, formData: FormData): Promise<SettingsState> {
  const { supabase, userId } = await requireUser();
  const minWords = Number(formData.get("min_words"));
  const freezes = Number(formData.get("freezes_per_month"));
  const timezone = String(formData.get("timezone") ?? "");

  if (!Number.isInteger(minWords) || minWords < 10 || minWords > 500) return { error: "El mínimo de palabras va de 10 a 500." };
  if (!Number.isInteger(freezes) || freezes < 0 || freezes > 5) return { error: "Los comodines van de 0 a 5 por mes." };
  try {
    new Intl.DateTimeFormat("es-MX", { timeZone: timezone });
  } catch {
    return { error: "Zona horaria no válida." };
  }

  const { error } = await supabase
    .from("profiles")
    .update({ min_words: minWords, freezes_per_month: freezes, timezone })
    .eq("id", userId);
  if (error) return { error: "No se pudo guardar." };
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function regenerateToken() {
  const { supabase, userId } = await requireUser();
  const token = crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, "");
  await supabase.from("profiles").update({ api_token: token }).eq("id", userId);
  revalidatePath("/ajustes");
  return { token };
}
