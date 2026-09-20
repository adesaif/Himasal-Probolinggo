"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { HimasalLogo } from "@/components/shared/himasal-logo";

const NAV_ITEMS = [
  { href: "/", label: "Beranda" },
  { href: "/profil", label: "Profil" },
  { href: "/struktur", label: "Struktur" },
  { href: "/berita", label: "Berita" },
  { href: "/agenda", label: "Agenda" },
  { href: "/masayikh", label: "Masayikh" },
  { href: "/galeri", label: "Galeri" },
  { href: "/kontak", label: "Kontak" },
];

export function PublicNav() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2 text-sm font-semibold tracking-tight">
          <HimasalLogo heightClassName="h-9" />
          <span className="hidden sm:inline">HIMASAL Probolinggo</span>
        </Link>

        <nav
          aria-label="Navigasi utama"
          className="hidden items-center gap-4 text-sm md:flex"
        >
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-muted-foreground transition-colors hover:text-foreground"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <Button asChild size="sm" className="hidden md:inline-flex">
            <Link href="/login">Login</Link>
          </Button>

          <Dialog open={mobileOpen} onOpenChange={setMobileOpen}>
            <DialogTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden"
                aria-label="Buka menu navigasi"
              >
                <Menu />
              </Button>
            </DialogTrigger>
            <DialogContent className="top-0 max-h-none translate-y-0 rounded-none sm:max-w-full">
              <DialogTitle className="sr-only">Menu Navigasi</DialogTitle>
              <div className="flex items-center gap-2 px-3 pt-4">
                <HimasalLogo heightClassName="h-10" />
                <span className="font-semibold tracking-tight">HIMASAL Probolinggo</span>
              </div>
              <nav
                aria-label="Navigasi mobile"
                className="flex flex-col gap-1 pt-4"
              >
                {NAV_ITEMS.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    className="rounded-md px-3 py-3 text-base font-medium text-foreground hover:bg-accent"
                  >
                    {item.label}
                  </Link>
                ))}
                <Button asChild className="mt-2" onClick={() => setMobileOpen(false)}>
                  <Link href="/login">Login</Link>
                </Button>
              </nav>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </header>
  );
}
