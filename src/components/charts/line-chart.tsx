"use client";

import { useEffect, useId, useRef, useState } from "react";

import { cn } from "@/lib/utils";

export type LineSeries = { key: string; label: string; color: string };
/** null = titik tidak ada (mis. bulan yang belum berjalan) - garis terputus. */
export type LinePoint = { label: string; values: Record<string, number | null> };

const DEFAULT_W = 640;
const H = 240;
const PAD = { top: 16, right: 16, bottom: 28, left: 36 };

function niceMax(value: number) {
  if (value <= 4) return 4;
  const pow = 10 ** Math.floor(Math.log10(value));
  const step = [1, 2, 2.5, 5, 10].find((s) => s * pow * 4 >= value) ?? 10;
  return step * pow * 4;
}

/**
 * Line chart SVG ringan (tanpa library): skala mengikuti lebar kartu lewat
 * viewBox, tooltip saat hover/tap/fokus keyboard, dan tabel tersembunyi untuk
 * pembaca layar. Tanpa animasi (aman untuk prefers-reduced-motion).
 */
export function LineChart({
  data,
  series,
  valueSuffix = "",
  ariaLabel,
  className,
}: {
  data: LinePoint[];
  series: LineSeries[];
  valueSuffix?: string;
  ariaLabel: string;
  className?: string;
}) {
  const id = useId();
  const [active, setActive] = useState<number | null>(null);
  // Lebar viewBox = lebar kontainer sebenarnya, supaya teks sumbu tetap
  // 11px di layar sempit (tidak ikut mengecil seperti SVG yang di-scale).
  const boxRef = useRef<HTMLDivElement>(null);
  const [W, setW] = useState(DEFAULT_W);
  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => {
      const width = Math.round(entry.contentRect.width);
      if (width > 0) setW(Math.max(280, width));
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const values = data.flatMap((d) => series.map((s) => d.values[s.key] ?? 0));
  const max = niceMax(Math.max(0, ...values));
  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;
  const x = (i: number) =>
    PAD.left + (data.length <= 1 ? innerW / 2 : (i / (data.length - 1)) * innerW);
  const y = (v: number) => PAD.top + innerH - (v / max) * innerH;
  const compactLabels = data.length > 1 && innerW / (data.length - 1) < 34;
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((t) => Math.round(max * t * 10) / 10);

  function pathFor(key: string) {
    let d = "";
    let drawing = false;
    data.forEach((point, i) => {
      const v = point.values[key];
      if (v === null || v === undefined) {
        drawing = false;
        return;
      }
      d += `${drawing ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)} `;
      drawing = true;
    });
    return d.trim();
  }

  const activePoint = active !== null ? data[active] : null;
  const tooltipLeft = active !== null ? (x(active) / W) * 100 : 0;

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <div ref={boxRef} className="relative">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="h-auto w-full touch-pan-y select-none"
          role="img"
          aria-label={ariaLabel}
          aria-describedby={`${id}-table`}
          onPointerLeave={() => setActive(null)}
        >
          {ticks.map((t) => (
            <g key={t}>
              <line
                x1={PAD.left}
                x2={W - PAD.right}
                y1={y(t)}
                y2={y(t)}
                className="stroke-border"
                strokeDasharray={t === 0 ? undefined : "3 4"}
              />
              <text
                x={PAD.left - 8}
                y={y(t)}
                textAnchor="end"
                dominantBaseline="middle"
                className="fill-muted-foreground text-[11px]"
              >
                {t}
              </text>
            </g>
          ))}

          {data.map((d, i) =>
            compactLabels && i % 2 === 1 ? null : (
              <text
                key={d.label}
                x={x(i)}
                y={H - 8}
                textAnchor="middle"
                className="fill-muted-foreground text-[11px]"
              >
                {d.label}
              </text>
            ),
          )}

          {active !== null ? (
            <line
              x1={x(active)}
              x2={x(active)}
              y1={PAD.top}
              y2={PAD.top + innerH}
              className="stroke-muted-foreground/40"
            />
          ) : null}

          {series.map((s) => (
            <path
              key={s.key}
              d={pathFor(s.key)}
              fill="none"
              stroke={s.color}
              strokeWidth={2.5}
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          ))}

          {series.map((s) =>
            data.map((d, i) => {
              const v = d.values[s.key];
              if (v === null || v === undefined) return null;
              return (
                <circle
                  key={`${s.key}-${i}`}
                  cx={x(i)}
                  cy={y(v)}
                  r={active === i ? 5 : 3}
                  fill={s.color}
                  className="stroke-background"
                  strokeWidth={2}
                />
              );
            }),
          )}

          {/* Area interaksi per titik-x (hover, tap, fokus keyboard). */}
          {data.map((d, i) => {
            const half = data.length <= 1 ? innerW / 2 : innerW / (data.length - 1) / 2;
            return (
              <rect
                key={`hit-${d.label}`}
                x={x(i) - half}
                y={PAD.top}
                width={half * 2}
                height={innerH}
                fill="transparent"
                tabIndex={0}
                role="button"
                aria-label={`${d.label}: ${series
                  .map((s) => `${s.label} ${d.values[s.key] ?? "-"}${valueSuffix}`)
                  .join(", ")}`}
                className="cursor-crosshair outline-none focus-visible:fill-primary/10"
                onPointerEnter={() => setActive(i)}
                onPointerDown={() => setActive(i)}
                onFocus={() => setActive(i)}
                onBlur={() => setActive(null)}
              />
            );
          })}
        </svg>

        {activePoint ? (
          <div
            aria-hidden
            className="pointer-events-none absolute top-1 z-10 min-w-36 -translate-x-1/2 rounded-lg border bg-popover px-3 py-2 text-xs text-popover-foreground shadow-md"
            style={{ left: `clamp(4.5rem, ${tooltipLeft}%, calc(100% - 4.5rem))` }}
          >
            <p className="mb-1 font-semibold">{activePoint.label}</p>
            {series.map((s) => (
              <p key={s.key} className="flex items-center justify-between gap-3">
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <span className="size-2 rounded-full" style={{ background: s.color }} />
                  {s.label}
                </span>
                <span className="font-medium tabular-nums">
                  {activePoint.values[s.key] ?? "-"}
                  {activePoint.values[s.key] !== null && activePoint.values[s.key] !== undefined
                    ? valueSuffix
                    : ""}
                </span>
              </p>
            ))}
          </div>
        ) : null}
      </div>

      <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
        {series.map((s) => (
          <span key={s.key} className="flex items-center gap-1.5">
            <span className="h-0.5 w-4 rounded-full" style={{ background: s.color }} />
            {s.label}
          </span>
        ))}
      </div>

      {/* Tabel untuk pembaca layar - dibungkus div karena <table> tidak
          menghormati ukuran 1px dari sr-only (bisa melebarkan halaman). */}
      <div id={`${id}-table`} className="sr-only">
        <table>
          <caption>{ariaLabel}</caption>
          <thead>
            <tr>
              <th>Periode</th>
              {series.map((s) => (
                <th key={s.key}>{s.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((d) => (
              <tr key={d.label}>
                <td>{d.label}</td>
                {series.map((s) => (
                  <td key={s.key}>{d.values[s.key] ?? "-"}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
