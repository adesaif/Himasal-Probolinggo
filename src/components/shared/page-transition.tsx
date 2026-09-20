"use client";

import { usePathname } from "next/navigation";

/**
 * Fade + translateY halus (lihat .animate-page-in di globals.css) setiap
 * kali pathname berubah. Dipasang di sekitar area KONTEN saja (bukan
 * nav/header/footer) supaya chrome halaman tidak ikut remount saat navigasi
 * - CSS-only (transform+opacity), otomatis nonaktif lewat
 * prefers-reduced-motion.
 */
export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div key={pathname} className="animate-page-in">
      {children}
    </div>
  );
}
