import Link from "next/link";

import { HimasalLogo } from "@/components/shared/himasal-logo";
import { cn } from "@/lib/utils";

/**
 * Satu komponen brand lockup (lambang + wordmark "HIMASALPROBOLINGGO")
 * dipakai identik di header desktop dan drawer mobile - lihat public-nav.tsx.
 * Bukan dua elemen berdampingan: wordmark dirender TANPA spasi antar kata
 * (hanya beda warna) supaya terbaca sebagai satu logotype, pakai font
 * terpisah dari teks UI (font-brand = Plus Jakarta Sans, lihat layout.tsx)
 * supaya tidak berbaur dengan label navigasi di sebelahnya.
 *
 * Ukuran logo & wordmark TIDAK memakai satu angka statis - keduanya naik
 * bertahap per breakpoint (base -> sm -> lg) supaya proporsi lockup tetap
 * seimbang, bukan sekadar diperbesar seragam. `size="compact"` untuk
 * konteks yang lebih sempit (drawer mobile) - proporsi logo:wordmark tetap
 * sama, hanya skalanya lebih kecil.
 *
 * `top-[1px]` pada wordmark adalah koreksi optical alignment manual (bukan
 * cuma items-center): lambang HIMASAL berbentuk perisai runcing di atas
 * dengan pita/tulisan di bagian bawah - titik tengah geometris bounding
 * box-nya sedikit lebih rendah dari titik tengah visual (badan perisai +
 * lingkaran emblem di tengah terasa sebagai "pusat massa" visualnya),
 * sehingga teks wordmark perlu digeser turun sedikit supaya optically
 * center terhadap lambang, bukan cuma rata tengah kotak pembungkusnya.
 *
 * Base text size sengaja kecil (13px, bukan 15px) - diverifikasi lewat
 * screenshot nyata di 320px: pada lebar itu wordmark 18 karakter nyaris
 * bertabrakan dengan tombol ikon di kanan header. `overflow-hidden` pada
 * Link ditambahkan sebagai jaring pengaman terakhir (clip, bukan tumpang
 * tindih) kalau suatu saat teks masih lebih lebar dari ruang yang tersisa.
 */
export function BrandLockup({
  size = "header",
  onNavigate,
  className,
}: {
  size?: "header" | "compact";
  onNavigate?: () => void;
  className?: string;
}) {
  const isCompact = size === "compact";

  return (
    <Link
      href="/"
      onClick={onNavigate}
      className={cn(
        "flex min-w-0 items-center overflow-hidden",
        isCompact ? "gap-2.5" : "gap-2 sm:gap-3 lg:gap-3.5",
        className,
      )}
    >
      <HimasalLogo
        heightClassName={isCompact ? "h-9" : "h-9 sm:h-10 lg:h-12"}
        className="shrink-0"
      />
      <span
        className={cn(
          "font-brand relative top-[1px] flex min-w-0 whitespace-nowrap font-extrabold uppercase",
          isCompact
            ? "text-lg tracking-[-0.01em]"
            : "text-[12px] tracking-[-0.01em] sm:text-lg lg:text-[26px] lg:tracking-[-0.02em]",
        )}
      >
        <span className="text-brand-text-himasal">HIMASAL</span>
        <span className="text-brand-text-probolinggo">PROBOLINGGO</span>
      </span>
    </Link>
  );
}
