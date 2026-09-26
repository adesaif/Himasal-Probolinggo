// Donut chart CSS murni (conic-gradient), tanpa library/client JS - lihat
// catatan di grouped-bar-chart.tsx soal kenapa ini aman dari hydration error.

export type DonutSegment = {
  key: string;
  label: string;
  value: number;
  colorHex: string;
  colorClass: string;
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
      <div className="flex flex-1 flex-col gap-1.5 text-sm">
        {segments.map((s) => (
          <div key={s.key} className="flex items-center justify-between gap-3">
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <span className={`size-2.5 shrink-0 rounded-sm ${s.colorClass}`} />
              {s.label}
            </span>
            <span className="font-medium tabular-nums">
              {s.value}
              {total > 0 ? ` (${Math.round((s.value / total) * 100)}%)` : ""}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
