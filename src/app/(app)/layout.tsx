import { Nav } from "@/components/nav";
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
      <Nav punishmentCount={pending} />
      <main className="min-w-0 flex-1 pb-[calc(5rem+env(safe-area-inset-bottom))] md:pb-12">{children}</main>
    </div>
  );
}
