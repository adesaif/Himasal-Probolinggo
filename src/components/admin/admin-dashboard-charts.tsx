import { Card, CardContent } from "@/components/ui/card";
import { DonutChart, type DonutSegment } from "@/components/charts/donut-chart";
import { GroupedBarChart, type BarChartDatum } from "@/components/charts/grouped-bar-chart";
import {
  KecamatanDistribution,
  type KecamatanCount,
} from "@/components/monitoring/kecamatan-distribution";
import type { RecentEventRow } from "@/components/monitoring/recent-events-table";
import {
  ATTENDANCE_STATUS_CHART_COLOR,
  ATTENDANCE_STATUS_LABEL,
  BELUM_ABSEN_LABEL,
} from "@/lib/attendance";
import { ACCOUNT_STATUS_LABEL } from "@/lib/alumni-account-status";
import { formatDateID } from "@/lib/format-date";

const MONTH_LABELS = [
  "Jan", "Feb", "Mar", "Apr", "Mei", "Jun",
  "Jul", "Agu", "Sep", "Okt", "Nov", "Des",
];

const ATTENDANCE_KEYS = ["HADIR", "TIDAK_HADIR", "IZIN", "SAKIT"] as const;

export type AlumniSummary = {
  total_alumni: number;
  alumni_aktif: number;
  alumni_tidak_aktif: number;
  akun_belum_ada: number;
  akun_undangan_terkirim: number;
  akun_menunggu_password: number;
  akun_aktif: number;
};

export type PeriodStat = {
  month: number;
  total_events: number;
  total_mandatory_events: number;
  hadir: number;
  tidak_hadir: number;
  izin: number;
  sakit: number;
};

function ChartCard({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-3">
        <div>
          <h3 className="font-semibold tracking-tight">{title}</h3>
          {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
        </div>
        {children}
      </CardContent>
    </Card>
  );
}

function EmptyChart({ children }: { children: React.ReactNode }) {
  return <p className="py-6 text-center text-sm text-muted-foreground">{children}</p>;
}

/**
 * Chart Dashboard Admin - SATU sumber untuk semua Admin (Admin Pusat maupun
 * Admin yang diangkat). Semua angka dari RPC database yang sama dengan
 * /monitoring (monitoring_alumni_summary, monitoring_alumni_by_kecamatan,
 * monitoring_recent_events, monitoring_period_stats) - tidak ada data
 * dummy/hardcoded.
 */
export function AdminDashboardCharts({
  summary,
  byKecamatan,
  latestEvent,
  periodStats,
  year,
}: {
  summary: AlumniSummary;
  byKecamatan: KecamatanCount[];
  latestEvent: RecentEventRow | null;
  periodStats: PeriodStat[];
  year: number;
}) {
  // Status akun: status yang memang dipakai sistem (undangan alumni masih
  // aktif), dihitung dari auth.users oleh database.
  const accountSegments: DonutSegment[] = [
    {
      key: "tanpa_akun",
      label: ACCOUNT_STATUS_LABEL.tanpa_akun,
      value: summary.akun_belum_ada,
      colorHex: "#a3a3a3",
      colorClass: "bg-neutral-400",
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
      colorHex: "#16a34a",
      colorClass: "bg-green-600",
    },
  ];

  const attendanceSegments: DonutSegment[] = latestEvent
    ? [
        ...ATTENDANCE_KEYS.map((key) => ({
          key,
          label: ATTENDANCE_STATUS_LABEL[key],
          value: latestEvent[key.toLowerCase() as "hadir" | "tidak_hadir" | "izin" | "sakit"],
          colorHex: ATTENDANCE_STATUS_CHART_COLOR[key].hex,
          colorClass: ATTENDANCE_STATUS_CHART_COLOR[key].className,
        })),
        {
          key: "BELUM_ABSEN",
          label: BELUM_ABSEN_LABEL,
          value: latestEvent.belum_absen,
          colorHex: ATTENDANCE_STATUS_CHART_COLOR.BELUM_ABSEN.hex,
          colorClass: ATTENDANCE_STATUS_CHART_COLOR.BELUM_ABSEN.className,
        },
      ]
    : [];

  const hasAttendanceTrend = periodStats.some(
    (p) => p.hadir + p.tidak_hadir + p.izin + p.sakit > 0,
  );
  const hasEventTrend = periodStats.some((p) => p.total_events > 0);

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ChartCard
          title="Distribusi Alumni per Kecamatan"
          description="24 kecamatan master data, termasuk yang masih 0."
        >
          <KecamatanDistribution
            rows={byKecamatan.filter((r) => r.id !== null || r.total > 0)}
            totalAlumni={summary.total_alumni}
          />
        </ChartCard>

        <div className="flex flex-col gap-4">
          <ChartCard
            title="Status Akun Alumni"
            description="Status login - terpisah dari status Aktif/Tidak Aktif."
          >
            {summary.total_alumni === 0 ? (
              <EmptyChart>Belum ada data alumni.</EmptyChart>
            ) : (
              <DonutChart segments={accountSegments} centerLabel="Alumni" />
            )}
          </ChartCard>

          <ChartCard
            title="Absensi Kegiatan Terakhir"
            description={
              latestEvent
                ? `${latestEvent.title} · ${formatDateID(latestEvent.start_at)}`
                : undefined
            }
          >
            {latestEvent ? (
              <DonutChart segments={attendanceSegments} centerLabel="Peserta" />
            ) : (
              <EmptyChart>Belum ada kegiatan dengan data absensi.</EmptyChart>
            )}
          </ChartCard>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ChartCard title={`Kegiatan per Bulan (${year})`}>
          {hasEventTrend ? (
            <GroupedBarChart
              data={periodStats.map(
                (p): BarChartDatum => ({
                  label: MONTH_LABELS[p.month - 1],
                  values: { total: p.total_events, wajib: p.total_mandatory_events },
                }),
              )}
              series={[
                { key: "total", label: "Total Kegiatan", colorClass: "bg-primary" },
                { key: "wajib", label: "Wajib Hadir", colorClass: "bg-amber-500" },
              ]}
            />
          ) : (
            <EmptyChart>Belum ada kegiatan pada tahun {year}.</EmptyChart>
          )}
        </ChartCard>

        <ChartCard title={`Absensi per Bulan (${year})`}>
          {hasAttendanceTrend ? (
            <GroupedBarChart
              data={periodStats.map(
                (p): BarChartDatum => ({
                  label: MONTH_LABELS[p.month - 1],
                  values: {
                    HADIR: p.hadir,
                    TIDAK_HADIR: p.tidak_hadir,
                    IZIN: p.izin,
                    SAKIT: p.sakit,
                  },
                }),
              )}
              series={ATTENDANCE_KEYS.map((key) => ({
                key,
                label: ATTENDANCE_STATUS_LABEL[key],
                colorClass: ATTENDANCE_STATUS_CHART_COLOR[key].className,
              }))}
            />
          ) : (
            <EmptyChart>Belum ada data absensi pada tahun {year}.</EmptyChart>
          )}
        </ChartCard>
      </div>
    </div>
  );
}
