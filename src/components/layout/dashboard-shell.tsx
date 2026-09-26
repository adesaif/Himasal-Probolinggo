"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { LogoutButton } from "@/components/shared/logout-button";
import { HimasalLogo } from "@/components/shared/himasal-logo";
import { PageTransition } from "@/components/shared/page-transition";
import { cn } from "@/lib/utils";

export type DashboardNavItem = { href: string; label: string };

function isActivePath(pathname: string, href: string) {
  if (href === "/admin" || href === "/dashboard" || href === "/monitoring") {
    return pathname === href;
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function DashboardShell({
  title,
  navItems,
  children,
}: {
  title: string;
  navItems?: DashboardNavItem[];
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
          <span className="flex items-center gap-2 text-sm font-semibold tracking-tight">
            <HimasalLogo heightClassName="h-8" />
            <span>
              HIMASAL Probolinggo — {title}
            </span>
          </span>
          <LogoutButton />
        </div>
        {navItems && navItems.length > 0 ? (
          <nav
            aria-label={`Navigasi ${title}`}
            className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-4 pb-2 text-sm"
          >
            {navItems.map((item) => {
              const active = isActivePath(pathname, item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "shrink-0 rounded-md px-3 py-1.5 transition-colors",
                    active
                      ? "bg-primary/10 font-medium text-primary"
                      : "text-muted-foreground hover:bg-accent hover:text-foreground",
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        ) : null}
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
        <PageTransition>{children}</PageTransition>
      </main>
    </div>
  );
}
