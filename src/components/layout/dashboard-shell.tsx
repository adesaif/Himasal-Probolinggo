import Link from "next/link";

import { LogoutButton } from "@/components/shared/logout-button";
import { HimasalLogo } from "@/components/shared/himasal-logo";

export type DashboardNavItem = { href: string; label: string };

export function DashboardShell({
  title,
  navItems,
  children,
}: {
  title: string;
  navItems?: DashboardNavItem[];
  children: React.ReactNode;
}) {
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
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="shrink-0 rounded-md px-3 py-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        ) : null}
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
        {children}
      </main>
    </div>
  );
}
