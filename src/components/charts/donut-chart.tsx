// Donut chart CSS murni (conic-gradient), tanpa library/client JS - lihat
// catatan di grouped-bar-chart.tsx soal kenapa ini aman dari hydration error.

import Link from "next/link";

export type DonutSegment = {
  key: string;
  label: string;
  value: number;
  colorHex: string;
  colorClass: string;
  /** Tautan drill-down (opsional) - baris legend menjadi link. */
  href?: string;
};

export function DonutChart({
  segments,
  centerLabel = "Total",
}: {
  segments: DonutSegment[];
  centerLabel?: string;
}) {
  const total = segments.reduce((sum, s) => sum + s.value, 0);

  let cumulative = 0;
  const stops = segments.map((s) => {
    const start = total > 0 ? (cumulative / total) * 100 : 0;
    cumulative += s.value;
    const end = total > 0 ? (cumulative / total) * 100 : 0;
    return `${s.colorHex} ${start}% ${end}%`;
  });
  const gradient =
    total > 0
      ? `conic-gradient(${stops.join(", ")})`
      : "conic-gradient(var(--muted) 0% 100%)";

  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row">
      <div
        className="relative size-40 shrink-0 rounded-full"
        style={{ background: gradient }}
      >
        <div className="absolute inset-[18%] flex flex-col items-center justify-center rounded-full bg-background text-center">
          <span className="text-xl font-semibold tabular-nums">{total}</span>
          <span className="text-[10px] text-muted-foreground">{centerLabel}</span>
        </div>
      </div>
      <div className="flex w-full min-w-0 flex-1 flex-col gap-1 text-sm">
        {segments.map((s) => {
          const content = (
            <>
              <span className="flex min-w-0 items-center gap-1.5 text-muted-foreground">
                <span className={`size-2.5 shrink-0 rounded-sm ${s.colorClass}`} />
                <span className="truncate">{s.label}</span>
              </span>
              <span className="shrink-0 font-medium tabular-nums">
                {s.value}
                {total > 0 ? ` (${Math.round((s.value / total) * 100)}%)` : ""}
              </span>
            </>
          );
          return s.href ? (
            <Link
              key={s.key}
              href={s.href}
              className="-mx-2 flex items-center justify-between gap-3 rounded-md px-2 py-1 transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            >
              {content}
            </Link>
          ) : (
            <div key={s.key} className="flex items-center justify-between gap-3 py-1">
              {content}
            </div>
          );
        })}
      </div>
    </div>
  );
}
