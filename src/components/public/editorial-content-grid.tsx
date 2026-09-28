import Link from "next/link";
import { ArrowRight, CalendarDays } from "lucide-react";

import { cn } from "@/lib/utils";

export type EditorialItem = {
  id: string;
  href: string;
  title: string;
  summary?: string | null;
  imageUrl?: string | null;
  /** Label topik dari site_topics - tidak pernah di-hardcode di sini. */
  topicLabel?: string | null;
  dateLabel?: string | null;
  isFeatured?: boolean;
};

const MAX_ITEMS = 5;

/**
 * Card utama: konten Unggulan (is_featured) pertama yang punya foto, lalu
 * konten pertama yang punya foto, lalu konten pertama. Urutan sisanya
 * tetap mengikuti urutan sumber (mis. terbaru lebih dulu).
 */
function pickLead(items: EditorialItem[]) {
  const index = Math.max(
    0,
    [
      items.findIndex((i) => i.isFeatured && i.imageUrl),
      items.findIndex((i) => i.imageUrl),
    ].find((i) => i >= 0) ?? 0,
  );
  return { lead: items[index], rest: items.filter((_, i) => i !== index) };
}

function EditorialCard({
  item,
  variant,
  className,
}: {
  item: EditorialItem;
  variant: "lead" | "small";
  className?: string;
}) {
  const lead = variant === "lead";

  return (
    <Link
      href={item.href}
      className={cn(
        // Foto adalah elemen utama; kartu tanpa foto memakai permukaan navy
        // polos (bukan gambar pengganti).
        "group relative isolate flex overflow-hidden rounded-[22px] border border-white/10 bg-slate-900 shadow-sm outline-none transition-[transform,box-shadow] duration-300 ease-out focus-visible:ring-[3px] focus-visible:ring-ring/60 motion-safe:hover:-translate-y-1 hover:shadow-[0_18px_40px_-18px_rgba(2,6,23,0.55)] sm:rounded-[26px]",
        className,
      )}
    >
      {item.imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={item.imageUrl}
          alt=""
          loading={lead ? "eager" : "lazy"}
          className="absolute inset-0 -z-10 h-full w-full object-cover object-[center_15%] transition-transform duration-700 ease-out motion-safe:group-hover:scale-[1.04]"
        />
      ) : null}

      {/* Overlay gelap dari bawah - hanya untuk keterbacaan teks, foto asli
          di bagian atas tetap tampil apa adanya. */}
      <div
        aria-hidden
        className={cn(
          "absolute inset-x-0 bottom-0 -z-10 bg-gradient-to-t from-slate-950/95 via-slate-950/55 to-transparent",
          lead ? "h-[78%] sm:h-[70%]" : "h-[85%]",
        )}
      />

      <div
        className={cn(
          "mt-auto flex w-full flex-col text-white",
          lead ? "gap-3 p-5 sm:gap-4 sm:p-8" : "gap-2.5 p-4 sm:p-5 lg:p-4 xl:p-5",
        )}
      >
        {item.topicLabel ? (
          <span
            className={cn(
              "w-fit rounded-full bg-primary font-semibold text-primary-foreground shadow-sm",
              lead ? "px-3.5 py-1 text-xs sm:text-sm" : "px-3 py-0.5 text-xs",
            )}
          >
            {item.topicLabel}
          </span>
        ) : null}

        <h3
          className={cn(
            "font-semibold tracking-tight text-balance",
            lead
              ? "line-clamp-3 text-2xl leading-tight sm:text-3xl lg:text-[2.1rem] lg:leading-[1.15]"
              : "line-clamp-2 text-base leading-snug sm:text-lg lg:text-base xl:text-lg",
          )}
        >
          {item.title}
        </h3>

        {lead && item.summary ? (
          <p className="line-clamp-2 max-w-2xl text-sm leading-relaxed text-white/80 sm:text-base">
            {item.summary}
          </p>
        ) : null}

        <div className="flex items-center justify-between gap-3 pt-1">
          {item.dateLabel ? (
            <p
              className={cn(
                "flex min-w-0 items-center gap-2 text-white/80",
                lead ? "text-sm" : "text-xs sm:text-sm lg:text-xs xl:text-sm",
              )}
            >
              <CalendarDays className={cn("shrink-0", lead ? "size-4" : "size-3.5")} />
              <span className="truncate">{item.dateLabel}</span>
            </p>
          ) : (
            <span />
          )}
          <span
            aria-hidden
            className={cn(
              "flex shrink-0 items-center justify-center rounded-full border border-white/20 bg-white/15 backdrop-blur-sm transition-colors duration-300 group-hover:bg-primary group-hover:border-primary",
              lead ? "size-11 sm:size-12" : "size-9 sm:size-10 lg:size-9 xl:size-10",
            )}
          >
            <ArrowRight
              className={cn(
                "transition-transform duration-300 motion-safe:group-hover:translate-x-0.5",
                lead ? "size-5" : "size-4",
              )}
            />
          </span>
        </div>
      </div>
    </Link>
  );
}

/**
 * Grid editorial Beranda: satu card foto besar (utama) + card foto kecil
 * dalam 2 kolom. Semua foto berasal dari konten CMS; tanpa foto pengganti,
 * tanpa angka views (tidak ada field views di sumber data).
 *
 * Komposisi per ukuran layar:
 *  - Mobile  : 1 kolom, card utama lebih tinggi (4:5), card lain 16:11.
 *  - Tablet  : card utama melebar penuh (16:9), card lain grid 2 kolom.
 *  - Desktop : card utama di kiri setinggi grid 2x2 di kanan.
 * Jumlah card kecil 1-4 ditangani tanpa sel kosong dan tanpa card sangat
 * lebar (rasio ekstrem memotong foto potret): 3 card kecil = 1 card tinggi
 * + 2 card bertumpuk di sampingnya.
 *
 * Foto: object-cover dengan posisi center 15% untuk SEMUA foto (tidak ada
 * data titik fokus per foto di CMS) - kepala pada foto potret tidak
 * terpotong, foto landscape hampir tidak terpengaruh.
 */
export function EditorialContentGrid({ items }: { items: EditorialItem[] }) {
  if (items.length === 0) return null;
  const { lead, rest } = pickLead(items.slice(0, MAX_ITEMS));

  if (rest.length === 0) {
    return (
      <EditorialCard
        item={lead}
        variant="lead"
        className="aspect-[4/5] sm:aspect-[16/9]"
      />
    );
  }

  const rows = rest.length > 2 ? 2 : 1;

  return (
    <div className="grid grid-cols-1 gap-4 sm:gap-5 lg:grid-cols-[minmax(0,0.92fr)_minmax(0,1fr)]">
      <EditorialCard
        item={lead}
        variant="lead"
        className={cn(
          "aspect-[4/5] sm:aspect-[16/9] lg:aspect-auto",
          rows === 1 ? "lg:min-h-[21rem]" : "lg:min-h-[27rem] xl:min-h-[28rem]",
        )}
      />
      <div
        className={cn(
          "grid grid-cols-1 gap-4 sm:gap-5",
          rest.length > 1 && "sm:grid-cols-2",
          rows === 2 && "lg:grid-rows-2",
          rest.length === 3 && "sm:grid-rows-2",
        )}
      >
        {rest.map((item, index) => {
          // 3 card kecil: card pertama setinggi 2 baris, dua lainnya
          // bertumpuk di sampingnya (bukan card terakhir melebar 2 kolom).
          const tall = rest.length === 3 && index === 0;
          return (
            <EditorialCard
              key={item.id}
              item={item}
              variant="small"
              className={cn(
                "aspect-[16/11] sm:aspect-[5/4] lg:aspect-auto",
                tall && "sm:row-span-2 sm:aspect-auto",
                rest.length === 1 && "sm:aspect-[16/9] lg:aspect-auto",
              )}
            />
          );
        })}
      </div>
    </div>
  );
}
