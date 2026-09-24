"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import {
  ChevronsLeft,
  ChevronsRight,
  Menu,
  X,
  LayoutDashboard,
  Users,
  Newspaper,
  CalendarDays,
  Images,
  Sparkles,
  Tag,
  ListTree,
  Building2,
  Network,
  GraduationCap,
  QrCode,
  BookOpen,
  FileBarChart2,
  Settings,
} from "lucide-react";

import { Dialog, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { HimasalLogo } from "@/components/shared/himasal-logo";
import { LogoutButton } from "@/components/shared/logout-button";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { PageTransition } from "@/components/shared/page-transition";
import { cn } from "@/lib/utils";

// Nav items dibangun di Server Component (admin/layout.tsx) lalu dikirim ke
// AdminShell ("use client") sebagai prop - komponen ikon (function
// reference) TIDAK BOLEH melewati batas server/client Next.js, jadi di
// sini ikon direferensikan lewat key string, di-resolve ke komponen asli
// hanya di dalam client component ini.
const ADMIN_ICON_MAP = {
  dashboard: LayoutDashboard,
  users: Users,
  newspaper: Newspaper,
  calendar: CalendarDays,
  images: Images,
  sparkles: Sparkles,
  tag: Tag,
  "list-tree": ListTree,
  building: Building2,
  network: Network,
  "graduation-cap": GraduationCap,
  "qr-code": QrCode,
  "book-open": BookOpen,
  "file-bar-chart": FileBarChart2,
  settings: Settings,
} as const;

export type AdminIconKey = keyof typeof ADMIN_ICON_MAP;
export type AdminNavItem = { href: string; label: string; icon: AdminIconKey };
export type AdminNavGroup = { label: string; items: AdminNavItem[] };

const COLLAPSE_KEY = "himasal-admin-sidebar-collapsed";

function isActivePath(pathname: string, href: string) {
  if (href === "/admin") return pathname === "/admin";
  return pathname === href || pathname.startsWith(`${href}/`);
}

function NavLink({
  item,
  active,
  collapsed,
  onNavigate,
}: {
  item: AdminNavItem;
  active: boolean;
  collapsed: boolean;
  onNavigate?: () => void;
}) {
  const Icon = ADMIN_ICON_MAP[item.icon];
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      title={collapsed ? item.label : undefined}
      aria-current={active ? "page" : undefined}
      className={cn(
        "relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
        collapsed && "justify-center px-0",
        active
          ? "bg-sidebar-accent text-sidebar-accent-foreground"
          : "text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground",
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          "absolute inset-y-1.5 left-0 w-[3px] rounded-full bg-sidebar-primary transition-transform duration-200",
          active ? "scale-y-100" : "scale-y-0",
        )}
      />
      <Icon className="size-[18px] shrink-0" />
      {!collapsed ? <span className="truncate">{item.label}</span> : null}
    </Link>
  );
}

function SidebarContent({
  groups,
  pathname,
  collapsed,
  onNavigate,
}: {
  groups: AdminNavGroup[];
  pathname: string;
  collapsed: boolean;
  onNavigate?: () => void;
}) {
  return (
    <nav aria-label="Navigasi Admin" className="flex flex-1 flex-col gap-5 overflow-y-auto px-3 py-4">
      {groups.map((group) => (
        <div key={group.label} className="flex flex-col gap-1">
          {!collapsed ? (
            <p className="px-3 text-[11px] font-semibold tracking-wide text-sidebar-foreground/45 uppercase">
              {group.label}
            </p>
          ) : null}
          {group.items.map((item) => (
            <NavLink
              key={item.href}
              item={item}
              active={isActivePath(pathname, item.href)}
              collapsed={collapsed}
              onNavigate={onNavigate}
            />
          ))}
        </div>
      ))}
    </nav>
  );
}

/**
 * Shell khusus Admin (role "admin") - sidebar + topbar, terpisah dari
 * DashboardShell generik yang masih dipakai Alumni (/dashboard) dan Super
 * Admin (/monitoring), supaya redesign ini tidak menyentuh dua area lain
 * itu sama sekali.
 */
export function AdminShell({
  groups,
  children,
}: {
  groups: AdminNavGroup[];
  children: ReactNode;
}) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(COLLAPSE_KEY) === "1";
      // Preferensi tersimpan hanya diketahui setelah mount (localStorage
      // tidak ada di server) - satu render tambahan di sini disengaja,
      // sama seperti pola hydrate-from-storage di ThemeToggle.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setCollapsed(stored);
    } catch {
      // localStorage bisa gagal (mode privat) - tetap expanded, tidak fatal.
    }
  }, []);

  function toggleCollapsed() {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(COLLAPSE_KEY, next ? "1" : "0");
      } catch {
        // sama seperti di atas - preferensi saja, bukan state kritikal.
      }
      return next;
    });
  }

  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar desktop */}
      <aside
        className={cn(
          "sticky top-0 hidden h-screen shrink-0 flex-col border-r border-sidebar-border bg-sidebar transition-[width] duration-200 lg:flex",
          collapsed ? "w-[4.5rem]" : "w-64",
        )}
      >
        <div
          className={cn(
            "flex h-16 shrink-0 items-center gap-2 border-b border-sidebar-border px-4",
            collapsed && "justify-center px-0",
          )}
        >
          <HimasalLogo heightClassName="h-7" className="shrink-0" />
          {!collapsed ? (
            <span className="truncate text-sm leading-tight font-bold tracking-[-0.01em] text-sidebar-foreground uppercase">
              HIMASAL{" "}
              <span className="font-medium text-sidebar-foreground/60 normal-case">
                Admin
              </span>
            </span>
          ) : null}
        </div>

        <SidebarContent groups={groups} pathname={pathname} collapsed={collapsed} />

        <div className="border-t border-sidebar-border p-3">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={toggleCollapsed}
            className={cn(
              "w-full text-sidebar-foreground/60 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground",
              collapsed && "px-0",
            )}
            aria-label={collapsed ? "Perluas sidebar" : "Ciutkan sidebar"}
          >
            {collapsed ? <ChevronsRight /> : <ChevronsLeft />}
            {!collapsed ? "Ciutkan" : null}
          </Button>
        </div>
      </aside>

      {/* Drawer mobile - slide dari kiri (posisi sama dengan sidebar
          desktop), bukan floating card seperti drawer publik, karena ini
          padanan mobile dari sidebar kerja, bukan menu marketing. */}
      <Dialog open={mobileOpen} onOpenChange={setMobileOpen}>
        <DialogPrimitive.Portal>
          <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm data-[state=closed]:animate-out data-[state=open]:animate-in data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 lg:hidden" />
          <DialogPrimitive.Content
            className="fixed inset-y-0 left-0 z-50 flex h-full w-[82vw] max-w-[300px] flex-col border-r border-sidebar-border bg-sidebar outline-none data-[state=closed]:animate-out data-[state=open]:animate-in data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left duration-300 lg:hidden"
          >
            <DialogPrimitive.Title className="sr-only">Navigasi Admin</DialogPrimitive.Title>
            <div className="flex h-16 shrink-0 items-center justify-between gap-2 border-b border-sidebar-border px-4">
              <span className="flex min-w-0 items-center gap-2">
                <HimasalLogo heightClassName="h-7" className="shrink-0" />
                <span className="truncate text-sm leading-tight font-bold tracking-[-0.01em] text-sidebar-foreground uppercase">
                  HIMASAL{" "}
                  <span className="font-medium text-sidebar-foreground/60 normal-case">
                    Admin
                  </span>
                </span>
              </span>
              <DialogPrimitive.Close asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Tutup navigasi"
                  className="size-9 shrink-0 rounded-full border border-sidebar-border text-sidebar-foreground"
                >
                  <X className="size-[18px]" />
                </Button>
              </DialogPrimitive.Close>
            </div>
            <SidebarContent
              groups={groups}
              pathname={pathname}
              collapsed={false}
              onNavigate={() => setMobileOpen(false)}
            />
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>

        {/* Topbar */}
        <div className="flex min-h-screen min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center gap-2 border-b bg-background/95 px-3 backdrop-blur sm:gap-3 sm:px-6">
            <DialogTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="size-9 shrink-0 lg:hidden"
                aria-label="Buka navigasi"
              >
                <Menu className="size-[18px]" />
              </Button>
            </DialogTrigger>

            <div className="min-w-0 flex-1" />

            <ThemeToggle className="size-9 shrink-0 rounded-full border border-border/70 bg-background/60" />
            <LogoutButton />
          </header>

          <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 sm:py-8">
            <PageTransition>{children}</PageTransition>
          </main>
        </div>
      </Dialog>
    </div>
  );
}
