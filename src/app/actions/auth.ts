"use server";

import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";


/** Supabase entra con correo; el usuario escribe su nombre de usuario y aquí se traduce. */
async function emailFor(identifier: string): Promise<string | null> {
  if (identifier.includes("@")) return identifier;
  const admin = createAdminClient();
  const { data: profile } = await admin.from("profiles").select("id").eq("username", identifier).maybeSingle();
  if (!profile) return null;
  const { data } = await admin.auth.admin.getUserById(profile.id);
  return data.user?.email ?? null;
}

export type SignInState = { error?: string; username?: string } | undefined;

export async function signIn(_prev: SignInState, formData: FormData): Promise<SignInState> {
  const identifier = String(formData.get("username") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const invalid = { error: "Usuario o contraseña incorrectos.", username: identifier };
  if (!identifier || !password) return { error: "Escribe tu usuario y tu contraseña.", username: identifier };

  const email = await emailFor(identifier);
  if (!email) return invalid;

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return invalid;
  redirect("/");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
