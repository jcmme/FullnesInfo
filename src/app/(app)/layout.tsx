import { Nav } from "@/components/nav";
import { ViewportGuard } from "@/components/viewport-guard";
import { getSession } from "@/lib/session";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { supabase, userId } = await getSession();
  const [failures, punishments] = await Promise.all([
    supabase.from("failures").select("id", { count: "exact", head: true }).eq("user_id", userId).eq("status", "pendiente"),
    supabase
      .from("punishments")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .in("status", ["asignado", "en_curso"]),
  ]);
  const pending = (failures.count ?? 0) + (punishments.count ?? 0);

  return (
    <div className="flex min-h-dvh">
      {/* En la app instalada el contenido pasa bajo la hora y la batería: esta franja lo cubre. */}
      <div aria-hidden className="status-scrim md:hidden" />
      <ViewportGuard />
      <Nav punishmentCount={pending} />
      <main className="min-w-0 flex-1 pb-[calc(var(--tabbar-space)+1.5rem)] md:pb-12">{children}</main>
    </div>
  );
}
