// Chart CSS murni (tanpa library, tanpa client JS) - dirender dari data
// yang sudah dihitung di server, sehingga hasilnya deterministik dan tidak
// mungkin memicu hydration error (tidak ada state/efek/ukuran browser yang
// dibaca saat render).

export type BarSeries = { key: string; label: string; colorClass: string };
export type BarChartDatum = { label: string; values: Record<string, number> };

export function GroupedBarChart({
  data,
  series,
}: {
  data: BarChartDatum[];
  series: BarSeries[];
}) {
  const max = Math.max(
    1,
    ...data.flatMap((d) => series.map((s) => d.values[s.key] ?? 0)),
  );

  return (
    <div className="flex flex-col gap-3">
      <div className="flex h-48 items-end gap-2 overflow-x-auto pb-1">
        {data.map((d) => (
          <div
            key={d.label}
            className="flex h-full min-w-8 flex-1 flex-col items-center gap-1"
          >
            <div className="flex h-full w-full items-end justify-center gap-0.5">
              {series.map((s) => {
                const value = d.values[s.key] ?? 0;
                const pct = max > 0 ? (value / max) * 100 : 0;
                return (
                  <div
                    key={s.key}
                    className={`w-full rounded-t-sm ${s.colorClass}`}
                    style={{ height: `${pct}%` }}
                    title={`${d.label} · ${s.label}: ${value}`}
                  />
                );
              })}
            </div>
            <span className="text-[10px] text-muted-foreground">{d.label}</span>
          </div>
        ))}
      </div>
      <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
        {series.map((s) => (
          <span key={s.key} className="flex items-center gap-1.5">
            <span className={`size-2.5 shrink-0 rounded-sm ${s.colorClass}`} />
            {s.label}
          </span>
        ))}
      </div>
    </div>
  );
}
