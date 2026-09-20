"use client";

import { useSyncExternalStore } from "react";
import { Moon, Sun } from "lucide-react";

import { Button } from "@/components/ui/button";

const STORAGE_KEY = "himasal-theme";

function subscribe(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["class"],
  });
  return () => observer.disconnect();
}

function getSnapshot() {
  return document.documentElement.classList.contains("dark");
}

// Default Navy di server (lihat inline script anti-flash di layout.tsx).
function getServerSnapshot() {
  return true;
}

/**
 * Satu tombol toggle Navy Blue <-> Light. Membaca/menulis class "dark" di
 * <html> lewat useSyncExternalStore (bukan state+effect) supaya selaras
 * dengan mutasi DOM yang terjadi di luar React (inline script anti-flash).
 */
export function ThemeToggle() {
  const isDark = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  function toggle() {
    const next = !isDark;
    document.documentElement.classList.toggle("dark", next);
    try {
      localStorage.setItem(STORAGE_KEY, next ? "dark" : "light");
    } catch {
      // localStorage bisa gagal (mode privat, dsb) - toggle tetap jalan
      // untuk sesi ini, hanya preferensinya yang tidak tersimpan.
    }
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      onClick={toggle}
      aria-label={isDark ? "Ganti ke mode terang" : "Ganti ke mode navy"}
    >
      {isDark ? <Sun className="size-4" /> : <Moon className="size-4" />}
    </Button>
  );
}
