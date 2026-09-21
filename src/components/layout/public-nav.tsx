"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import * as DialogPrimitive from "@radix-ui/react-dialog";

import { Dialog, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { HimasalLogo } from "@/components/shared/himasal-logo";
import { HeaderSearch } from "@/components/shared/header-search";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { cn } from "@/lib/utils";
import { isTopicActive, topicLabel, type SiteTopic, type TopicKey } from "@/lib/topics";

// Beranda dan Kontak bukan Topik (tidak ada di site_topics) - selalu tetap
// tampil. Sisanya mengikuti label + status aktif dari site_topics.
const TOPIC_NAV_ITEMS: { href: string; key: TopicKey; fallback: string }[] = [
  { href: "/profil", key: "profil", fallback: "Profil" },
  { href: "/struktur", key: "struktur", fallback: "Struktur" },
  { href: "/berita", key: "berita", fallback: "Berita" },
  { href: "/agenda", key: "agenda", fallback: "Agenda" },
  { href: "/masayikh", key: "masayikh", fallback: "Masayikh" },
  { href: "/galeri", key: "galeri", fallback: "Galeri" },
];

function buildNavItems(topics: SiteTopic[] | null | undefined) {
  const items: { href: string; label: string }[] = [{ href: "/", label: "Beranda" }];
  for (const item of TOPIC_NAV_ITEMS) {
    if (!isTopicActive(topics, item.key)) continue;
    items.push({ href: item.href, label: topicLabel(topics, item.key, item.fallback) });
  }
  items.push({ href: "/kontak", label: "Kontak" });
  return items;
}

function isActivePath(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

// size-8 (bukan size-9 bawaan Button) di breakpoint terkecil supaya logo +
// brand lockup + 3 tombol ikon tidak overflow horizontal di layar 320px
// (lihat verifikasi visual QA) - kembali ke size-9 mulai sm: seperti semula.
const ICON_BUTTON_CLASS =
  "size-8 rounded-full border border-border/70 bg-background/60 sm:size-9";

export function PublicNav({ topics }: { topics?: SiteTopic[] | null }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();
  const navItems = buildNavItems(topics);

  return (
    <header className="site-header sticky top-0 z-40 border-b bg-background/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <Link href="/" className="flex min-w-0 shrink items-center gap-1.5 sm:shrink-0 sm:gap-2.5">
          <HimasalLogo heightClassName="h-7 sm:h-9" className="shrink-0" />
          <span className="flex items-baseline whitespace-nowrap text-sm leading-none font-bold tracking-[-0.01em] uppercase sm:text-base">
            <span className="text-brand-text-himasal">HIMASAL</span>{" "}
            <span className="text-brand-text-probolinggo">PROBOLINGGO</span>
          </span>
        </Link>

        <nav
          aria-label="Navigasi utama"
          className="hidden items-center gap-1 text-sm lg:flex"
        >
          {navItems.map((item) => {
            const active = isActivePath(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative rounded-md px-3 py-1.5 transition-colors",
                  active
                    ? "text-primary font-medium"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground",
                )}
              >
                {item.label}
                <span
                  className={cn(
                    "absolute inset-x-3 -bottom-[1px] h-0.5 scale-x-0 rounded-full bg-primary transition-transform duration-200",
                    active && "scale-x-100",
                  )}
                  aria-hidden="true"
                />
              </Link>
            );
          })}
        </nav>

        <div className="flex shrink-0 items-center gap-1 sm:gap-2">
          <Button asChild size="sm" className="mr-1 hidden lg:inline-flex">
            <Link href="/login">Login</Link>
          </Button>

          <HeaderSearch className={ICON_BUTTON_CLASS} />
          <ThemeToggle className={ICON_BUTTON_CLASS} />

          <Dialog open={mobileOpen} onOpenChange={setMobileOpen}>
            <DialogTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className={cn(ICON_BUTTON_CLASS, "lg:hidden")}
                aria-label={mobileOpen ? "Tutup menu navigasi" : "Buka menu navigasi"}
              >
                <span className="relative flex size-4 items-center justify-center">
                  <span
                    className={cn(
                      "absolute h-0.5 w-4 rounded-full bg-current transition-all duration-200",
                      mobileOpen ? "rotate-45" : "-translate-y-1.5",
                    )}
                  />
                  <span
                    className={cn(
                      "absolute h-0.5 w-4 rounded-full bg-current transition-opacity duration-150",
                      mobileOpen && "opacity-0",
                    )}
                  />
                  <span
                    className={cn(
                      "absolute h-0.5 w-4 rounded-full bg-current transition-all duration-200",
                      mobileOpen ? "-rotate-45" : "translate-y-1.5",
                    )}
                  />
                </span>
              </Button>
            </DialogTrigger>
            <DialogPrimitive.Portal>
              <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/50 data-[state=closed]:animate-out data-[state=open]:animate-in data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
              <DialogPrimitive.Content
                className="fixed inset-y-0 right-0 z-50 flex h-full w-[80vw] max-w-[280px] flex-col overflow-y-auto border-l bg-background shadow-xl outline-none data-[state=closed]:animate-out data-[state=open]:animate-in data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right duration-300"
              >
                <DialogPrimitive.Title className="sr-only">Menu Navigasi</DialogPrimitive.Title>
                <div className="flex items-center gap-2 px-4 pt-5 pb-2">
                  <HimasalLogo heightClassName="h-10" />
                  <span className="font-semibold tracking-tight">HIMASAL Probolinggo</span>
                </div>
                <nav
                  aria-label="Navigasi mobile"
                  className="flex flex-col gap-1 px-3 pt-2 pb-4"
                >
                  {navItems.map((item) => {
                    const active = isActivePath(pathname, item.href);
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setMobileOpen(false)}
                        aria-current={active ? "page" : undefined}
                        className={cn(
                          "rounded-md px-3 py-3 text-base font-medium transition-colors",
                          active
                            ? "bg-accent text-primary"
                            : "text-foreground hover:bg-accent",
                        )}
                      >
                        {item.label}
                      </Link>
                    );
                  })}
                  <Button asChild className="mt-2" onClick={() => setMobileOpen(false)}>
                    <Link href="/login">Login</Link>
                  </Button>
                </nav>
              </DialogPrimitive.Content>
            </DialogPrimitive.Portal>
          </Dialog>
        </div>
      </div>
    </header>
  );
}
