import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
  CalendarCheck2,
  ChevronRight,
  History,
  ShieldCheck,
  UserCog,
  UserRound,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { DonutChart, type DonutSegment } from "@/components/charts/donut-chart";
import { GroupedBarChart } from "@/components/charts/grouped-bar-chart";
import { LineChart } from "@/components/charts/line-chart";
import {
  ACTIVITY_STATUSES,
  ACTIVITY_STATUS_COLOR,
  ACTIVITY_STATUS_LABEL,
  EVENT_STATUS_LABEL,
  MONTH_SHORT,
  formatPercent,
  type ActivityStatus,
} from "@/lib/alumni-activity";
import { ACCOUNT_STATUS_LABEL } from "@/lib/alumni-account-status";
import { ATTENDANCE_STATUS_CHART_COLOR, BELUM_ABSEN_LABEL } from "@/lib/attendance";
import { formatDateID, formatDateTimeID } from "@/lib/format-date";
import { cn } from "@/lib/utils";
import type { Database } from "@/types/database.types";

type Fn = Database["public"]["Functions"];
export type AlumniSummary = Fn["monitoring_alumni_summary"]["Returns"][number];
export type KecamatanRow = Fn["monitoring_alumni_by_kecamatan"]["Returns"][number];
export type OverviewRow = Fn["monitoring_overview"]["Returns"][number];
export type PeriodRow = Fn["monitoring_period_stats"]["Returns"][number];
export type RecentEventRow = Fn["monitoring_recent_events"]["Returns"][number];
export type ActivityRow = Fn["monitoring_recent_activity"]["Returns"][number];

/** Tujuan drill-down - "/admin/..." untuk Admin, "/monitoring/..." untuk Super Admin. */
export type DrillLinks = {
  alumniList: (query: Record<string, string>) => string;
  alumni: (id: string) => string;
  event?: (id: string) => string;
};

export function listHref(base: string, query: Record<string, string>) {
  const qs = new URLSearchParams(query).toString();
  return qs ? `${base}?${qs}` : base;
}

const STATUS_TONE: Record<ActivityStatus, string> = {
  aktif: "text-green-600 dark:text-green-400",
  tidak_aktif: "text-red-600 dark:text-red-400",
  tidak_aktif_sementara: "text-amber-600 dark:text-amber-400",
  belum_ada_data: "text-muted-foreground",
};

export function SectionTitle({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-2">
      <div className="min-w-0">
        <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
        {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
      </div>
      {action}
    </div>
  );
}

export function Panel({
  title,
  description,
  action,
  className,
  children,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <Card className={cn("gap-0 rounded-2xl", className)}>
      <CardContent className="flex h-full flex-col gap-4">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="font-semibold tracking-tight">{title}</h3>
            {description ? (
              <p className="text-sm text-muted-foreground">{description}</p>
            ) : null}
          </div>
          {action}
        </div>
        {children}
      </CardContent>
    </Card>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-xl border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">
      {children}
    </p>
  );
}

/** KPI card - bisa diklik (drill-down) bila `href` diisi. */
export function KpiCard({
  label,
  value,
  icon: Icon,
  hint,
  href,
  tone,
  accent,
}: {
  label: string;
  value: string | number;
  icon: LucideIcon;
  hint?: string;
  href?: string;
  tone?: string;
  accent?: boolean;
}) {
  const body = (
    <>
      <div className="flex items-start justify-between gap-2">
        <p className={cn("text-xs sm:text-sm", accent ? "text-white/75" : "text-muted-foreground")}>
          {label}
        </p>
        <span
          aria-hidden
          className={cn(
            "flex size-8 shrink-0 items-center justify-center rounded-lg sm:size-9",
            accent ? "bg-white/15 text-white" : "bg-primary/10 text-primary",
          )}
        >
          <Icon className="size-4" />
        </span>
      </div>
      <p
        className={cn(
          "text-2xl font-semibold tracking-tight tabular-nums sm:text-3xl",
          accent ? "text-white" : tone,
        )}
      >
        {value}
      </p>
      {hint ? (
        <p className={cn("flex items-center gap-1 text-xs", accent ? "text-white/70" : "text-muted-foreground")}>
          {hint}
          {href ? <ChevronRight className="size-3.5 shrink-0" /> : null}
        </p>
      ) : null}
    </>
  );
  const cls = cn(
    "flex min-w-0 flex-col gap-2 rounded-2xl border p-4 shadow-sm transition-colors sm:p-5",
    accent
      ? "border-transparent bg-gradient-to-br from-[#0b1f4d] to-[#1d4ed8] text-white"
      : "bg-card",
    href && !accent && "hover:border-primary/40 hover:bg-primary/[0.03]",
    href && accent && "hover:brightness-110",
    href && "outline-none focus-visible:ring-2 focus-visible:ring-ring",
  );
  return href ? (
    <Link href={href} className={cls}>
      {body}
    </Link>
  ) : (
    <div className={cls}>{body}</div>
  );
}

/** Donut status keaktifan (4 status) - tiap status membuka daftar Alumni. */
export function StatusPanel({
  summary,
  links,
}: {
  summary: AlumniSummary;
  links: DrillLinks;
}) {
  const counts: Record<ActivityStatus, number> = {
    aktif: summary.status_aktif,
    tidak_aktif: summary.status_tidak_aktif,
    tidak_aktif_sementara: summary.status_sementara,
    belum_ada_data: summary.status_belum_ada_data,
  };
  const tahunQuery: Record<string, string> = summary.is_final ? { tahun: String(summary.tahun) } : {};
  const segments: DonutSegment[] = ACTIVITY_STATUSES.map((s) => ({
    key: s,
    label: ACTIVITY_STATUS_LABEL[s],
    value: counts[s],
    colorHex: ACTIVITY_STATUS_COLOR[s].hex,
    colorClass: ACTIVITY_STATUS_COLOR[s].className,
    href: links.alumniList({ status: s, ...tahunQuery }),
  }));

  return (
    <Panel
      title={`Status Alumni ${summary.tahun}`}
      description={
        summary.is_final
          ? "Rekap final: ≥50% hadir = Aktif."
          : "Tahun berjalan. Klik status untuk melihat daftar Alumni."
      }
    >
      {summary.total_alumni === 0 ? (
        <Empty>Belum ada data Alumni.</Empty>
      ) : (
        <DonutChart segments={segments} centerLabel="Alumni" />
      )}
    </Panel>
  );
}

/** Status akun login + distribusi role. */
export function AccountPanel({
  summary,
  links,
}: {
  summary: AlumniSummary;
  links: DrillLinks;
}) {
  const segments: DonutSegment[] = [
    {
      key: "tanpa_akun",
      label: ACCOUNT_STATUS_LABEL.tanpa_akun,
      value: summary.akun_belum_ada,
      colorHex: "#a3a3a3",
      colorClass: "bg-neutral-400",
      href: links.alumniList({ akun: "belum" }),
    },
    {
      key: "undangan_terkirim",
      label: ACCOUNT_STATUS_LABEL.undangan_terkirim,
      value: summary.akun_undangan_terkirim,
      colorHex: "#f59e0b",
      colorClass: "bg-amber-500",
    },
    {
      key: "menunggu_password",
      label: ACCOUNT_STATUS_LABEL.menunggu_password,
      value: summary.akun_menunggu_password,
      colorHex: "#0ea5e9",
      colorClass: "bg-sky-500",
    },
    {
      key: "aktif",
      label: ACCOUNT_STATUS_LABEL.aktif,
      value: summary.akun_aktif,
      colorHex: "#1d4ed8",
      colorClass: "bg-blue-700",
    },
  ];
  const roles: { label: string; value: number; icon: LucideIcon }[] = [
    { label: "Alumni", value: summary.role_alumni, icon: UserRound },
    { label: "Admin", value: summary.role_admin, icon: UserCog },
    { label: "Super Admin", value: summary.role_super_admin, icon: ShieldCheck },
  ];

  return (
    <Panel title="Akun & Role" description="Status akun login Alumni dan jumlah akun per role.">
      {summary.total_alumni === 0 ? (
        <Empty>Belum ada data Alumni.</Empty>
      ) : (
        <DonutChart segments={segments} centerLabel="Alumni" />
      )}
      <div className="grid grid-cols-3 gap-2">
        {roles.map((r) => (
          <div key={r.label} className="rounded-xl bg-muted/60 px-3 py-2">
            <p className="flex items-center gap-1 text-xs text-muted-foreground">
              <r.icon className="size-3.5 shrink-0" />
              <span className="truncate">{r.label}</span>
            </p>
            <p className="text-lg font-semibold tabular-nums">{r.value}</p>
          </div>
        ))}
      </div>
    </Panel>
  );
}

/** Bar horizontal per Kecamatan (komposisi status) - tiap baris bisa diklik. */
export function KecamatanPanel({
  rows,
  year,
  isFinal,
  links,
}: {
  rows: KecamatanRow[];
  year: number;
  isFinal: boolean;
  links: DrillLinks;
}) {
  const visible = rows.filter((r) => r.kecamatan_id !== null || r.total > 0);
  const max = Math.max(1, ...visible.map((r) => r.total));
  const total = visible.reduce((acc, r) => acc + r.total, 0);
  const tahunQuery: Record<string, string> = isFinal ? { tahun: String(year) } : {};

  return (
    <Panel
      title="Distribusi Alumni per Kecamatan"
      description="24 kecamatan master data. Klik kecamatan untuk melihat daftar Alumni."
    >
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
        {ACTIVITY_STATUSES.map((s) => (
          <span key={s} className="flex items-center gap-1.5">
            <span className={cn("size-2.5 rounded-sm", ACTIVITY_STATUS_COLOR[s].className)} />
            {ACTIVITY_STATUS_LABEL[s]}
          </span>
        ))}
      </div>
      <ul className="flex flex-col">
        {visible.map((r) => {
          const unmapped = r.kecamatan_id === null;
          const parts: [ActivityStatus, number][] = [
            ["aktif", r.aktif],
            ["tidak_aktif", r.tidak_aktif],
            ["tidak_aktif_sementara", r.sementara],
            ["belum_ada_data", r.belum_ada_data],
          ];
          return (
            <li key={r.kecamatan_id ?? "belum-dipetakan"}>
              <Link
                href={links.alumniList({
                  kecamatan: r.kecamatan_id ?? "__belum_dipetakan__",
                  ...tahunQuery,
                })}
                className="grid grid-cols-[minmax(5.5rem,8.5rem)_minmax(0,1fr)_2rem] items-center gap-2 rounded-lg px-1.5 py-1.5 text-sm transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none sm:gap-3"
                title={`${r.kecamatan_nama}: ${r.total} Alumni`}
              >
                <span className={cn("truncate", unmapped && "text-muted-foreground italic")}>
                  {r.kecamatan_nama}
                </span>
                <span className="flex h-2.5 overflow-hidden rounded-full bg-muted">
                  <span className="flex h-full" style={{ width: `${(r.total / max) * 100}%` }}>
                    {parts.map(([s, v]) =>
                      v > 0 ? (
                        <span
                          key={s}
                          className={cn("h-full", ACTIVITY_STATUS_COLOR[s].className)}
                          style={{ width: `${(v / r.total) * 100}%` }}
                        />
                      ) : null,
                    )}
                  </span>
                </span>
                <span className="text-right font-medium tabular-nums">{r.total}</span>
              </Link>
            </li>
          );
        })}
      </ul>
      <p className="border-t pt-3 text-xs text-muted-foreground">
        Total: <span className="font-medium text-foreground">{total}</span> Alumni
      </p>
    </Panel>
  );
}

/** Tren kehadiran per bulan (line chart) - hanya kegiatan terlaksana. */
export function AttendanceTrendPanel({
  stats,
  year,
  className,
}: {
  stats: PeriodRow[];
  year: number;
  className?: string;
}) {
  const hasData = stats.some((p) => p.kegiatan > 0);
  const keys = ["HADIR", "TIDAK_HADIR", "IZIN", "SAKIT"] as const;
  const field = { HADIR: "hadir", TIDAK_HADIR: "tidak_hadir", IZIN: "izin", SAKIT: "sakit" } as const;
  const label = { HADIR: "Hadir", TIDAK_HADIR: "Tidak Hadir", IZIN: "Izin", SAKIT: "Sakit" };

  return (
    <Panel
      title={`Tren Kehadiran ${year}`}
      description="Jumlah catatan kehadiran per bulan pada kegiatan yang sudah terlaksana."
      className={className}
    >
      {hasData ? (
        <LineChart
          ariaLabel={`Tren kehadiran per bulan tahun ${year}`}
          data={stats.map((p) => ({
            label: MONTH_SHORT[p.month - 1],
            values: Object.fromEntries(
              keys.map((k) => [k, p.akan_datang ? null : p[field[k]]]),
            ),
          }))}
          series={keys.map((k) => ({
            key: k,
            label: label[k],
            color: ATTENDANCE_STATUS_CHART_COLOR[k].hex,
          }))}
        />
      ) : (
        <Empty>Belum ada kegiatan terlaksana pada tahun {year}.</Empty>
      )}
    </Panel>
  );
}

/** Jumlah kegiatan terlaksana per bulan. */
export function EventMonthlyPanel({ stats, year }: { stats: PeriodRow[]; year: number }) {
  const hasData = stats.some((p) => p.kegiatan > 0);
  return (
    <Panel title={`Kegiatan Terlaksana per Bulan (${year})`}>
      {hasData ? (
        <GroupedBarChart
          data={stats.map((p) => ({
            label: MONTH_SHORT[p.month - 1],
            values: { total: p.kegiatan, wajib: p.kegiatan_wajib },
          }))}
          series={[
            { key: "total", label: "Kegiatan terlaksana", colorClass: "bg-primary" },
            { key: "wajib", label: "Wajib hadir", colorClass: "bg-amber-500" },
          ]}
        />
      ) : (
        <Empty>Belum ada kegiatan terlaksana pada tahun {year}.</Empty>
      )}
    </Panel>
  );
}

/** Angka statistik kegiatan & kehadiran (tahun terpilih). */
export function EventStatsGrid({ overview }: { overview: OverviewRow }) {
  const items: { label: string; value: string | number; tone?: string }[] = [
    { label: "Kegiatan terlaksana", value: overview.kegiatan_terlaksana },
    { label: "Wajib hadir", value: overview.kegiatan_wajib_terlaksana },
    { label: "Akan datang", value: overview.kegiatan_akan_datang },
    { label: "Hadir", value: overview.hadir, tone: "text-green-600 dark:text-green-400" },
    { label: "Tidak Hadir", value: overview.tidak_hadir, tone: "text-red-600 dark:text-red-400" },
    { label: "Izin", value: overview.izin, tone: "text-blue-600 dark:text-blue-400" },
    { label: "Sakit", value: overview.sakit, tone: "text-purple-600 dark:text-purple-400" },
    { label: BELUM_ABSEN_LABEL, value: overview.tidak_tercatat },
    { label: "Tingkat kehadiran", value: formatPercent(overview.tingkat_kehadiran) },
  ];
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      {items.map((i) => (
        <div key={i.label} className="rounded-xl border bg-card px-3 py-2.5">
          <p className="truncate text-xs text-muted-foreground" title={i.label}>
            {i.label}
          </p>
          <p className={cn("text-xl font-semibold tabular-nums", i.tone)}>{i.value}</p>
        </div>
      ))}
    </div>
  );
}

/** Daftar kegiatan terbaru + statistik kehadirannya. */
export function RecentEventsPanel({
  events,
  eventHref,
  title = "Kegiatan Terbaru",
  action,
}: {
  events: RecentEventRow[];
  eventHref?: (id: string) => string;
  title?: string;
  action?: React.ReactNode;
}) {
  return (
    <Panel title={title} action={action}>
      {events.length === 0 ? (
        <Empty>Belum ada kegiatan yang dipublikasikan.</Empty>
      ) : (
        <ul className="flex flex-col divide-y">
          {events.map((e) => {
            const held = e.status_kegiatan === "selesai";
            const body = (
              <div className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="font-medium break-words">{e.title}</p>
                  <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                    <span>{formatDateID(e.start_at)}</span>
                    <Badge variant={held ? "success" : e.status_kegiatan === "berlangsung" ? "warning" : "neutral"}>
                      {EVENT_STATUS_LABEL[e.status_kegiatan] ?? e.status_kegiatan}
                    </Badge>
                    {e.is_mandatory ? <Badge variant="warning">Wajib</Badge> : null}
                  </p>
                </div>
                {held ? (
                  <div className="flex shrink-0 flex-wrap items-center gap-x-3 gap-y-1 text-xs tabular-nums">
                    <span className="text-green-600 dark:text-green-400">Hadir {e.hadir}</span>
                    <span className="text-red-600 dark:text-red-400">Tidak {e.tidak_hadir}</span>
                    <span className="text-blue-600 dark:text-blue-400">Izin {e.izin}</span>
                    <span className="text-purple-600 dark:text-purple-400">Sakit {e.sakit}</span>
                    <span className="text-muted-foreground">Belum {e.belum_absen}</span>
                    <span className="font-semibold">{formatPercent(e.tingkat_kehadiran)}</span>
                  </div>
                ) : (
                  <span className="text-xs text-muted-foreground">Belum dihitung</span>
                )}
              </div>
            );
            return (
              <li key={e.id}>
                {eventHref ? (
                  <Link
                    href={eventHref(e.id)}
                    className="-mx-2 block rounded-lg px-2 transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                  >
                    {body}
                  </Link>
                ) : (
                  body
                )}
              </li>
            );
          })}
        </ul>
      )}
    </Panel>
  );
}

const ACTIVITY_ICON: Record<string, LucideIcon> = {
  absensi: CalendarCheck2,
  kegiatan: History,
  sistem: UserCog,
};

/** Aktivitas terbaru - hanya dari data yang tercatat (tanpa aktivitas buatan). */
export function RecentActivityPanel({
  items,
  links,
  className,
}: {
  items: ActivityRow[];
  links: DrillLinks;
  className?: string;
}) {
  return (
    <Panel title="Aktivitas Terbaru" className={className}>
      {items.length === 0 ? (
        <Empty>Belum ada aktivitas tercatat.</Empty>
      ) : (
        <ol className="flex flex-col gap-1">
          {items.map((a, i) => {
            const Icon = ACTIVITY_ICON[a.jenis] ?? History;
            const href = a.alumni_id
              ? links.alumni(a.alumni_id)
              : a.event_id && links.event
                ? links.event(a.event_id)
                : undefined;
            const body = (
              <div className="flex items-start gap-3 py-2">
                <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Icon className="size-4" />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-medium break-words">{a.judul}</p>
                  {a.keterangan ? (
                    <p className="text-xs break-words text-muted-foreground">{a.keterangan}</p>
                  ) : null}
                  {a.waktu ? (
                    <p className="text-[11px] text-muted-foreground/80">{formatDateTimeID(a.waktu)}</p>
                  ) : null}
                </div>
              </div>
            );
            return (
              <li key={`${a.jenis}-${a.waktu}-${i}`}>
                {href ? (
                  <Link
                    href={href}
                    className="-mx-2 block rounded-lg px-2 transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                  >
                    {body}
                  </Link>
                ) : (
                  body
                )}
              </li>
            );
          })}
        </ol>
      )}
    </Panel>
  );
}

export { STATUS_TONE };

/** Pemilih tahun (tautan, tanpa JS). Tahun lalu = rekap final. */
export function YearTabs({
  years,
  current,
  hrefFor,
  currentYear,
}: {
  years: number[];
  current: number;
  hrefFor: (year: number) => string;
  currentYear: number;
}) {
  if (years.length <= 1) return null;
  return (
    <nav aria-label="Pilih tahun" className="flex flex-wrap gap-1.5">
      {years.map((y) => (
        <Link
          key={y}
          href={hrefFor(y)}
          aria-current={y === current ? "page" : undefined}
          className={cn(
            "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
            y === current
              ? "border-primary bg-primary text-primary-foreground"
              : "bg-card hover:bg-accent",
          )}
        >
          {y}
          <span className="ml-1 opacity-70">{y === currentYear ? "berjalan" : "final"}</span>
        </Link>
      ))}
    </nav>
  );
}
