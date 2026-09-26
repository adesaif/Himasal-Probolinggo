"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import {
  X,
  Home,
  Mail,
  Newspaper,
  CalendarDays,
  Images,
  Building2,
  Network,
  GraduationCap,
  Tag,
  type LucideIcon,
} from "lucide-react";

import { Dialog, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { BrandLockup } from "@/components/shared/brand-lockup";
import { HeaderSearch } from "@/components/shared/header-search";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { cn } from "@/lib/utils";
import { topicHref, type SiteTopic, type SystemTopicKey } from "@/lib/topics";

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

// Ikon HANYA untuk presentasi drawer mobile (lihat DrawerNavLink) - dipetakan
// dari topic KEY (bukan label, tidak pernah hardcode nama topik), khusus
// enam topik sistem supaya konsisten dengan bahasa ikon Admin Sidebar.
// Topik custom (dan "konten", yang berperilaku seperti topik generik) selalu
// jatuh ke DEFAULT_TOPIC_ICON - tetap konsisten walau key-nya bebas.
const SYSTEM_TOPIC_ICON: Record<SystemTopicKey, LucideIcon> = {
  berita: Newspaper,
  agenda: CalendarDays,
  galeri: Images,
  profil: Building2,
  struktur: Network,
  masayikh: GraduationCap,
};
const DEFAULT_TOPIC_ICON = Tag;

function topicIcon(topic: SiteTopic): LucideIcon {
  if (topic.is_system && topic.key in SYSTEM_TOPIC_ICON) {
    return SYSTEM_TOPIC_ICON[topic.key as SystemTopicKey];
  }
  return DEFAULT_TOPIC_ICON;
}

type DrawerNavItem = { href: string; label: string; icon: LucideIcon };

// Builder terpisah khusus drawer mobile (desktop nav tetap pakai
// buildNavItems yang sudah ada, tidak disentuh) - mengelompokkan item jadi
// tiga section bergaya Admin Sidebar (heading kecil uppercase di atas tiap
// grup), tapi grouping-nya cuma presentasi: "Beranda"/"Kontak" tetap fixed,
// isi grup tengah 100% dari site_topics aktif (rename/reorder/nonaktif/
// hapus otomatis ikut berubah, sama seperti desktop nav).
function buildDrawerSections(topics: SiteTopic[] | null | undefined) {
  const topicItems: DrawerNavItem[] = [...(topics ?? [])]
    .filter((t) => t.is_active)
    .sort((a, b) => a.display_order - b.display_order)
    .map((topic) => ({ href: topicHref(topic), label: topic.label, icon: topicIcon(topic) }));

  return [
    { heading: "Menu", items: [{ href: "/", label: "Beranda", icon: Home }] },
    ...(topicItems.length > 0 ? [{ heading: "Topik", items: topicItems }] : []),
    { heading: "Lainnya", items: [{ href: "/kontak", label: "Kontak", icon: Mail }] },
  ];
}

function isActivePath(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

// Bahasa visual item nav persis Admin Sidebar (AdminShell.tsx: NavLink) -
// pill rounded + bar aksen kiri saat aktif, token warna `sidebar-*` yang
// sama - tapi ukuran ikon/teks/padding sengaja lebih lega (20px/16px) untuk
// konteks publik/marketing, bukan admin yang padat.
function DrawerNavLink({
  href,
  label,
  icon: Icon,
  active,
  onNavigate,
}: {
  href: string;
  label: string;
  icon: LucideIcon;
  active: boolean;
  onNavigate: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={cn(
        "relative flex items-center gap-3.5 rounded-xl px-4 py-3 text-[16px] font-medium transition-colors",
        active
          ? "bg-sidebar-accent text-sidebar-accent-foreground"
          : "text-sidebar-foreground/75 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground",
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          "absolute inset-y-2 left-0 w-[3px] rounded-full bg-sidebar-primary transition-transform duration-200",
          active ? "scale-y-100" : "scale-y-0",
        )}
      />
      <Icon className="size-5 shrink-0" />
      <span className="truncate">{label}</span>
    </Link>
  );
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
  const drawerSections = buildDrawerSections(topics);

  return (
    <header className="site-header sticky top-0 z-40 border-b bg-background/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-2 px-3 sm:px-4 lg:h-[74px]">
        <BrandLockup className="min-w-0 shrink sm:shrink-0" />

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

        <div className="flex shrink-0 items-center gap-0 sm:gap-2">
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
              <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm data-[state=closed]:animate-out data-[state=open]:animate-in data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
              {/* Drawer ditampilkan sebagai surface mengambang (inset dari
                  tepi layar, rounded penuh) - bukan panel yang ditempel rata
                  ke sisi layar - supaya terasa muncul DI ATAS halaman.
                  Token warna disamakan dengan Admin Sidebar (bg-sidebar,
                  sidebar-border, dst - lihat globals.css) supaya bahasa
                  visualnya konsisten (navy premium di dark mode), tapi
                  bentuk mengambang + isi menu (site_topics) tetap khas
                  publik, bukan salinan Admin. */}
              <DialogPrimitive.Content
                className="fixed inset-y-3 right-3 z-50 flex w-[85vw] max-w-[340px] flex-col overflow-hidden rounded-2xl border border-sidebar-border bg-sidebar shadow-[0_20px_50px_-12px_rgba(15,23,42,0.25)] outline-none data-[state=closed]:animate-out data-[state=open]:animate-in data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right duration-300"
              >
                <DialogPrimitive.Title className="sr-only">Menu Navigasi</DialogPrimitive.Title>

                <div className="flex items-center justify-between gap-2 border-b border-sidebar-border px-4 pt-4 pb-3">
                  <BrandLockup size="compact" onNavigate={() => setMobileOpen(false)} />
                  <DialogPrimitive.Close asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Tutup menu navigasi"
                      className="size-11 shrink-0 rounded-full border border-sidebar-border text-sidebar-foreground hover:bg-sidebar-accent/60"
                    >
                      <X className="size-[18px]" />
                    </Button>
                  </DialogPrimitive.Close>
                </div>

                {/* Section heading kecil uppercase di atas tiap grup (bahasa
                    visual Admin Sidebar), tapi grup tengah "Topik" 100% dari
                    site_topics aktif - rename/reorder/nonaktif/hapus di
                    Admin otomatis tercermin di sini tanpa perubahan kode. */}
                <nav
                  aria-label="Navigasi mobile"
                  className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-3 py-4"
                >
                  {drawerSections.map((section) => (
                    <div key={section.heading} className="flex flex-col gap-1">
                      <p className="px-4 text-[11px] font-semibold tracking-wide text-sidebar-foreground/45 uppercase">
                        {section.heading}
                      </p>
                      {section.items.map((item) => (
                        <DrawerNavLink
                          key={item.href}
                          href={item.href}
                          label={item.label}
                          icon={item.icon}
                          active={isActivePath(pathname, item.href)}
                          onNavigate={() => setMobileOpen(false)}
                        />
                      ))}
                    </div>
                  ))}
                </nav>

                <div className="border-t border-sidebar-border px-4 pt-3 pb-4">
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
