"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";

import { Dialog, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { HimasalLogo } from "@/components/shared/himasal-logo";
import { HeaderSearch } from "@/components/shared/header-search";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { cn } from "@/lib/utils";
import { topicHref, type SiteTopic } from "@/lib/topics";

// Beranda dan Kontak bukan Topik (tidak ada di site_topics) - selalu tetap
// tampil. Sisanya (SEMUA topik aktif, sistem maupun custom) diambil dari
// site_topics, diurutkan sesuai display_order Admin - topik baru otomatis
// muncul di nav tanpa perubahan kode.
function buildNavItems(topics: SiteTopic[] | null | undefined) {
  const items: { href: string; label: string }[] = [{ href: "/", label: "Beranda" }];
  const active = [...(topics ?? [])]
    .filter((t) => t.is_active)
    .sort((a, b) => a.display_order - b.display_order);
  for (const topic of active) {
    items.push({ href: topicHref(topic), label: topic.label });
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
// Dua varian: normal (semua halaman, dan Beranda setelah scroll) memakai
// token tema seperti biasa; overlay (Beranda, sebelum scroll) SELALU
// terang - Hero selalu gelap/cinematic apa pun tema situs (lihat
// .hero-premium-bg), jadi kontras header di atasnya tidak boleh ikut
// tema, harus selalu terang.
const ICON_BUTTON_CLASS =
  "size-8 rounded-full border border-border/70 bg-background/60 sm:size-9";
const ICON_BUTTON_OVERLAY_CLASS =
  "size-8 rounded-full border border-white/25 bg-white/10 text-white hover:bg-white/20 hover:text-white sm:size-9";

// Scroll threshold rendah supaya transisi overlay -> solid terasa cepat,
// bukan menunggu user scroll jauh - header tetap "sticky" di kedua state
// (tidak pernah "position: absolute") supaya tidak ada lompatan posisi
// saat state berganti.
const SCROLL_SOLID_THRESHOLD = 32;

export function PublicNav({ topics }: { topics?: SiteTopic[] | null }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const pathname = usePathname();
  const navItems = buildNavItems(topics);

  // Header transparent/overlay HANYA di Beranda (satu-satunya halaman
  // dengan Hero) dan hanya sebelum discroll - begitu discroll (atau di
  // halaman lain yang tidak punya Hero), header kembali solid seperti
  // semula. Ini satu-satunya perubahan behavior; markup/route/logic
  // navigasi lain tidak disentuh.
  const isHomepage = pathname === "/";
  const overlay = isHomepage && !scrolled;

  useEffect(() => {
    // `overlay` sudah digerbang oleh isHomepage, jadi state `scrolled` tidak
    // relevan di luar Beranda - tidak perlu direset, listener cukup tidak
    // dipasang sama sekali di halaman lain.
    if (!isHomepage) return;
    function onScroll() {
      setScrolled(window.scrollY > SCROLL_SOLID_THRESHOLD);
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [isHomepage]);

  return (
    <header
      className={cn(
        "site-header sticky top-0 z-40 transition-[background-color,border-color,backdrop-filter] duration-300",
        overlay
          ? "border-b border-transparent bg-gradient-to-b from-black/45 via-black/15 to-transparent"
          : "border-b bg-background/95 backdrop-blur",
      )}
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-2 px-3 sm:px-4">
        <Link href="/" className="flex min-w-0 shrink items-center gap-1 sm:shrink-0 sm:gap-2.5">
          <HimasalLogo heightClassName="h-7 sm:h-9" className="shrink-0" />
          <span className="flex items-baseline whitespace-nowrap text-sm leading-none font-bold tracking-[-0.01em] uppercase sm:text-base">
            <span className={overlay ? "text-white" : "text-brand-text-himasal"}>HIMASAL</span>{" "}
            <span className={overlay ? "text-[#8fc3ef]" : "text-brand-text-probolinggo"}>
              PROBOLINGGO
            </span>
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
                  overlay
                    ? active
                      ? "text-white font-medium"
                      : "text-white/70 hover:bg-white/10 hover:text-white"
                    : active
                      ? "text-primary font-medium"
                      : "text-muted-foreground hover:bg-accent hover:text-foreground",
                )}
              >
                {item.label}
                <span
                  className={cn(
                    "absolute inset-x-3 -bottom-[1px] h-0.5 scale-x-0 rounded-full transition-transform duration-200",
                    overlay ? "bg-[#8fc3ef]" : "bg-primary",
                    active && "scale-x-100",
                  )}
                  aria-hidden="true"
                />
              </Link>
            );
          })}
        </nav>

        <div className="flex shrink-0 items-center gap-0 sm:gap-2">
          <Button
            asChild
            size="sm"
            className={cn(
              "mr-1 hidden lg:inline-flex",
              overlay && "bg-white text-[#0b1730] shadow-none hover:bg-white/90",
            )}
          >
            <Link href="/login">Login</Link>
          </Button>

          <HeaderSearch className={overlay ? ICON_BUTTON_OVERLAY_CLASS : ICON_BUTTON_CLASS} />
          <ThemeToggle className={overlay ? ICON_BUTTON_OVERLAY_CLASS : ICON_BUTTON_CLASS} />

          <Dialog open={mobileOpen} onOpenChange={setMobileOpen}>
            <DialogTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className={cn(overlay ? ICON_BUTTON_OVERLAY_CLASS : ICON_BUTTON_CLASS, "lg:hidden")}
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
              <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm data-[state=closed]:animate-out data-[state=open]:animate-in data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
              {/* Drawer ditampilkan sebagai surface mengambang (inset dari
                  tepi layar, rounded penuh) - bukan panel yang ditempel rata
                  ke sisi layar - supaya terasa muncul DI ATAS halaman. */}
              <DialogPrimitive.Content
                className="fixed inset-y-3 right-3 z-50 flex w-[85vw] max-w-[320px] flex-col overflow-hidden rounded-2xl border border-border/70 bg-card shadow-[0_20px_50px_-12px_rgba(15,23,42,0.25)] outline-none data-[state=closed]:animate-out data-[state=open]:animate-in data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right duration-300"
              >
                <DialogPrimitive.Title className="sr-only">Menu Navigasi</DialogPrimitive.Title>

                <div className="flex items-center justify-between gap-2 border-b border-border/70 px-3 pt-4 pb-3">
                  <Link
                    href="/"
                    onClick={() => setMobileOpen(false)}
                    className="flex min-w-0 items-center gap-1.5"
                  >
                    <HimasalLogo heightClassName="h-7" className="shrink-0" />
                    <span className="flex items-baseline whitespace-nowrap text-[13px] leading-none font-bold tracking-[-0.01em] uppercase">
                      <span className="text-brand-text-himasal">HIMASAL</span>{" "}
                      <span className="text-brand-text-probolinggo">PROBOLINGGO</span>
                    </span>
                  </Link>
                  <DialogPrimitive.Close asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Tutup menu navigasi"
                      className="size-11 shrink-0 rounded-full border border-border/70 bg-background/60"
                    >
                      <X className="size-[18px]" />
                    </Button>
                  </DialogPrimitive.Close>
                </div>

                {/* Setiap item jadi row bergaya editorial premium: bar
                    aksen tipis + warna primary saat aktif (bukan kotak
                    biru besar), muted saat tidak aktif - bahasa desain
                    yang sama dengan underline aktif di nav desktop. */}
                <nav
                  aria-label="Navigasi mobile"
                  className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto px-3 py-3"
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
                          "relative flex items-center rounded-lg py-2.5 pr-3 pl-4 text-[15px] font-medium transition-colors",
                          active
                            ? "bg-accent font-semibold text-primary"
                            : "text-foreground/80 hover:bg-accent/60 hover:text-foreground",
                        )}
                      >
                        <span
                          aria-hidden="true"
                          className={cn(
                            "absolute inset-y-1.5 left-0 w-[3px] rounded-full bg-primary transition-transform duration-200",
                            active ? "scale-y-100" : "scale-y-0",
                          )}
                        />
                        {item.label}
                      </Link>
                    );
                  })}
                </nav>

                <div className="border-t border-border/70 px-4 pt-3 pb-4">
                  <Button
                    asChild
                    size="lg"
                    className="h-11 w-full text-base"
                    onClick={() => setMobileOpen(false)}
                  >
                    <Link href="/login">Login</Link>
                  </Button>
                </div>
              </DialogPrimitive.Content>
            </DialogPrimitive.Portal>
          </Dialog>
        </div>
      </div>
    </header>
  );
}
