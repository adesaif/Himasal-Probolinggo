"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { House, QrCode, UserRound, type LucideIcon } from "lucide-react";

import { LogoutButton } from "@/components/shared/logout-button";
import { HimasalLogo } from "@/components/shared/himasal-logo";
import { PageTransition } from "@/components/shared/page-transition";
import { cn } from "@/lib/utils";

// Ikon dipilih lewat nama (string) karena navItems dikirim dari Server
// Component - komponen ikon tidak bisa diserialisasi.
const NAV_ICONS = {
  home: House,
  absensi: QrCode,
  profil: UserRound,
} satisfies Record<string, LucideIcon>;

export type DashboardNavItem = {
  href: string;
  label: string;
  icon?: keyof typeof NAV_ICONS;
};

function isActivePath(pathname: string, href: string, rootHref: string) {
  if (href === rootHref) return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

/**
 * Kerangka area member (Dashboard Alumni). Desktop: tab di bawah header.
 * Mobile: tab bar bawah supaya menu utama selalu terjangkau ibu jari.
 */
export function DashboardShell({
  title,
  rootHref,
  navItems,
  children,
}: {
  title: string;
  rootHref: string;
  navItems?: DashboardNavItem[];
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const hasNav = Boolean(navItems && navItems.length > 0);

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-3 px-4">
          <Link
            href={rootHref}
            className="flex min-w-0 items-center gap-2 rounded-md text-sm font-semibold tracking-tight focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            <HimasalLogo heightClassName="h-8" />
            <span className="truncate">
              <span className="hidden sm:inline">HIMASAL Probolinggo · </span>
              {title}
            </span>
          </Link>
          <LogoutButton />
        </div>
        {hasNav ? (
          <nav
            aria-label={`Navigasi ${title}`}
            className="mx-auto hidden max-w-6xl gap-1 px-4 pb-2 text-sm md:flex"
          >
            {navItems!.map((item) => {
              const active = isActivePath(pathname, item.href, rootHref);
              const Icon = item.icon ? NAV_ICONS[item.icon] : null;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex items-center gap-1.5 rounded-md px-3 py-1.5 transition-colors",
                    active
                      ? "bg-primary/10 font-medium text-primary"
                      : "text-muted-foreground hover:bg-accent hover:text-foreground",
                  )}
                >
                  {Icon ? <Icon className="size-4" aria-hidden="true" /> : null}
                  {item.label}
                </Link>
              );
            })}
          </nav>
        ) : null}
      </header>

      <main
        className={cn(
          "mx-auto w-full max-w-6xl flex-1 px-4 py-8",
          hasNav && "pb-28 md:pb-8",
        )}
      >
        <PageTransition>{children}</PageTransition>
      </main>

      {hasNav ? (
        <nav
          aria-label={`Navigasi ${title}`}
          className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
        >
          <ul className="mx-auto flex max-w-md">
            {navItems!.map((item) => {
              const active = isActivePath(pathname, item.href, rootHref);
              const Icon = item.icon ? NAV_ICONS[item.icon] : null;
              return (
                <li key={item.href} className="flex-1">
                  <Link
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "flex flex-col items-center gap-0.5 px-2 pt-2 pb-2.5 text-[11px] font-medium transition-colors",
                      active ? "text-primary" : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {Icon ? (
                      <span
                        className={cn(
                          "flex h-7 w-12 items-center justify-center rounded-full transition-colors",
                          active && "bg-primary/10",
                        )}
                      >
                        <Icon className="size-5" aria-hidden="true" />
                      </span>
                    ) : null}
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      ) : null}
    </div>
  );
}
