"use server";

import { revalidatePath } from "next/cache";
import { addDays, dayKey } from "@/lib/day";
import { requireUser } from "@/lib/supabase/server";

export type SettingsState = { error?: string; ok?: boolean } | undefined;

export async function updateSettings(_prev: SettingsState, formData: FormData): Promise<SettingsState> {
  const { supabase, userId } = await requireUser();
  const minWords = Number(formData.get("min_words"));
  const freezes = Number(formData.get("freezes_per_month"));
  const timezone = String(formData.get("timezone") ?? "");
  const cutoff = Number(formData.get("cutoff_hour"));

  if (!Number.isInteger(minWords) || minWords < 10 || minWords > 500) return { error: "El mínimo de palabras va de 10 a 500." };
  if (!Number.isInteger(freezes) || freezes < 0 || freezes > 5) return { error: "Los comodines van de 0 a 5 por mes." };
  if (!Number.isFinite(cutoff) || cutoff < 0 || cutoff > 5 || !Number.isInteger(cutoff * 2)) {
    return { error: "La hora de cierre va de 12:00 a 5:00 AM, en medias horas." };
  }
  try {
    new Intl.DateTimeFormat("es-MX", { timeZone: timezone });
  } catch {
    return { error: "Zona horaria no válida." };
  }

  const { error } = await supabase
    .from("profiles")
    .update({ min_words: minWords, freezes_per_month: freezes, timezone, cutoff_hour: cutoff })
    .eq("id", userId);
  if (error) return { error: "No se pudo guardar." };

  // Con una hora de cierre más tarde, un día que ya se había cerrado vuelve a estar abierto:
  // se quita su fallo (si aún no giraste la ruleta) y se vuelve a evaluar cuando cierre.
  const today = dayKey(new Date(), timezone, cutoff);
  await supabase.from("failures").delete().eq("user_id", userId).eq("status", "pendiente").gte("day", today);
  await supabase
    .from("profiles")
    .update({ evaluated_through: addDays(today, -1) })
    .eq("id", userId)
    .gte("evaluated_through", today);
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function regenerateToken() {
  const { supabase, userId } = await requireUser();
  const token = crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, "");
  const { error } = await supabase.from("profiles").update({ api_token: token }).eq("id", userId);
  // Sin esto, un error dejaba la pantalla mostrando un token que no sirve para nada.
  if (error) return { error: "No se pudo generar el token. Intenta otra vez." };
  revalidatePath("/ajustes");
  return { token };
}
