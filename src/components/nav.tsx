"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Barbell, BookmarksSimple, GearSix, Gift, SunHorizon, type Icon } from "@phosphor-icons/react";

type Tab = { href: string; label: string; icon: Icon };

const TABS: Tab[] = [
  { href: "/", label: "Hoy", icon: SunHorizon },
  { href: "/guardados", label: "Guardados", icon: BookmarksSimple },
  { href: "/caja", label: "Caja", icon: Gift },
  { href: "/castigos", label: "Castigos", icon: Barbell },
  { href: "/ajustes", label: "Ajustes", icon: GearSix },
];

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" || pathname.startsWith("/registrar") : pathname.startsWith(href);
}

function Badge({ count }: { count: number }) {
  if (!count) return null;
  return (
    <span className="absolute -top-1 left-1/2 ml-1.5 min-w-[1.125rem] rounded-full bg-bad px-1 text-center text-[0.6875rem] font-bold leading-[1.125rem] text-on-tint tabular">
      {count}
    </span>
  );
}

/** Tab bar translúcida en iPhone; barra lateral en iPad y Mac. */
export function Nav({ punishmentCount }: { punishmentCount: number }) {
  const pathname = usePathname();

  return (
    <>
      <nav
        aria-label="Secciones"
        className="material fixed inset-x-0 bottom-0 z-40 border-t hairline pb-safe md:hidden"
      >
        <ul className="mx-auto grid max-w-lg grid-cols-5">
          {TABS.map(({ href, label, icon: Icon }) => {
            const active = isActive(pathname, href);
            return (
              <li key={href}>
                <Link
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={`press flex min-h-[3.25rem] flex-col items-center justify-center gap-0.5 pt-1.5 ${
                    active ? "text-tint-ink" : "text-ink-3"
                  }`}
                >
                  <span className="relative">
                    <Icon size={26} weight={active ? "fill" : "regular"} aria-hidden />
                    {href === "/castigos" && <Badge count={punishmentCount} />}
                  </span>
                  <span className="text-[0.6875rem] font-medium leading-none">{label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <nav
        aria-label="Secciones"
        className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col gap-1 border-r hairline bg-surface-2/60 px-3 pt-8 md:flex lg:w-64"
      >
        <p className="mb-6 px-3 font-display text-xl font-bold tracking-[-0.02em]">FullnesInfo</p>
        {TABS.map(({ href, label, icon: Icon }) => {
          const active = isActive(pathname, href);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={`press flex min-h-11 items-center gap-3 rounded-control px-3 font-medium transition-colors ${
                active ? "bg-tint-soft text-tint-ink" : "text-ink-2 hover:bg-surface-2 hover:text-ink"
              }`}
            >
              <Icon size={22} weight={active ? "fill" : "regular"} aria-hidden />
              <span className="flex-1">{label}</span>
              {href === "/castigos" && punishmentCount > 0 && (
                <span className="chip bg-bad text-on-tint">{punishmentCount}</span>
              )}
            </Link>
          );
        })}
      </nav>
    </>
  );
}
