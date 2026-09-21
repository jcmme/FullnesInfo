import { createClient } from "@supabase/supabase-js";

/**
 * Cliente con la llave secreta: ignora RLS. Solo para las rutas de Atajos de iOS,
 * que se autentican con el token personal y filtran por user_id a mano.
 */
export function createAdminClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
