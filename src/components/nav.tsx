"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Barbell, BookmarksSimple, Compass, GearSix, SunHorizon, type Icon } from "@phosphor-icons/react";

type Tab = { href: string; label: string; icon: Icon };

const TABS: Tab[] = [
  { href: "/", label: "Hoy", icon: SunHorizon },
  { href: "/guardados", label: "Guardados", icon: BookmarksSimple },
  { href: "/descubrir", label: "Descubrir", icon: Compass },
  { href: "/castigos", label: "Castigos", icon: Barbell },
  { href: "/ajustes", label: "Ajustes", icon: GearSix },
];

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" || pathname.startsWith("/registrar") : pathname.startsWith(href);
}

function Badge({ count }: { count: number }) {
  if (!count) return null;
  return (
    // El número se lee aparte en la etiqueta del enlace; aquí sería "3Castigos".
    <span
      aria-hidden
      className="absolute -top-1 left-1/2 ml-1.5 min-w-[1.125rem] rounded-full bg-bad px-1 text-center text-[0.6875rem] font-bold leading-[1.125rem] text-on-tint tabular"
    >
      {count}
    </span>
  );
}

const tabLabel = (label: string, href: string, count: number) =>
  href === "/castigos" && count ? `${label}, ${count} ${count === 1 ? "pendiente" : "pendientes"}` : undefined;

/** Barra de pestañas flotante de vidrio en iPhone; barra lateral en iPad y Mac. */
export function Nav({ punishmentCount }: { punishmentCount: number }) {
  const pathname = usePathname();
  // Al escribir la nota o elegir temas la barra se esconde, como en las pantallas de
  // redactar de iOS: la tarea manda y su botón de guardar se queda con el fondo.
  const composing = pathname.startsWith("/registrar") || pathname.startsWith("/descubrir/elegir");

  return (
    <>
      <nav
        aria-label="Secciones"
        hidden={composing}
        className="tabbar material fixed inset-x-4 bottom-[var(--tabbar-gap)] z-40 mx-auto h-[var(--tabbar-h)] max-w-md rounded-full md:hidden"
      >
        <ul className="grid h-full grid-cols-5 items-center">
          {TABS.map(({ href, label, icon: Icon }) => {
            const active = isActive(pathname, href);
            return (
              <li key={href}>
                <Link
                  href={href}
                  aria-current={active ? "page" : undefined}
                  aria-label={tabLabel(label, href, punishmentCount)}
                  className={`press flex min-h-12 flex-col items-center justify-center gap-0.5 font-display ${
                    active ? "text-tint-ink" : "text-ink-2"
                  }`}
                >
                  <span className="relative">
                    <Icon size={26} weight={active ? "fill" : "regular"} aria-hidden />
                    {href === "/castigos" && <Badge count={punishmentCount} />}
                  </span>
                  <span className="text-[0.6875rem] font-semibold leading-none">{label}</span>
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
        <p className="mb-6 px-3 font-display text-xl font-bold tracking-[-0.02em]">Fuellness</p>
        {TABS.map(({ href, label, icon: Icon }) => {
          const active = isActive(pathname, href);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              aria-label={tabLabel(label, href, punishmentCount)}
              className={`press flex min-h-11 items-center gap-3 rounded-control px-3 font-medium transition-colors ${
                active ? "bg-tint-soft text-tint-ink" : "text-ink-2 hover:bg-surface-2 hover:text-ink"
              }`}
            >
              <Icon size={22} weight={active ? "fill" : "regular"} aria-hidden />
              <span className="flex-1">{label}</span>
              {href === "/castigos" && punishmentCount > 0 && (
                <span aria-hidden className="chip bg-bad text-on-tint">
                  {punishmentCount}
                </span>
              )}
            </Link>
          );
        })}
      </nav>
    </>
  );
}
