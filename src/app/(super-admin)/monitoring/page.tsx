import { Suspense } from "react";
import Link from "next/link";

import { createClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { StatCard } from "@/components/shared/stat-card";
import { MonitoringFilters } from "@/components/monitoring/monitoring-filters";
import { GroupedBarChart, type BarChartDatum } from "@/components/charts/grouped-bar-chart";
import { DonutChart, type DonutSegment } from "@/components/charts/donut-chart";
import { RecentEventsTable } from "@/components/monitoring/recent-events-table";
import {
  ATTENDANCE_STATUS_CHART_COLOR,
  ATTENDANCE_STATUS_LABEL,
  BELUM_ABSEN_LABEL,
} from "@/lib/attendance";

const MONTH_LABELS = [
  "Jan", "Feb", "Mar", "Apr", "Mei", "Jun",
  "Jul", "Agu", "Sep", "Okt", "Nov", "Des",
];

const ATTENDANCE_STATUS_KEYS = ["HADIR", "TIDAK_HADIR", "IZIN", "SAKIT"] as const;

function parseYear(value: string | undefined): number | undefined {
  if (!value) return undefined;
  const n = Number(value);
  return Number.isInteger(n) ? n : undefined;
}

function isUuidLike(value: string | undefined): value is string {
  return !!value && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

export default async function MonitoringDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string; event?: string; wilayah?: string; status?: string }>;
}) {
  const params = await searchParams;
  const year = parseYear(params.year);
  const eventId = isUuidLike(params.event) ? params.event : undefined;
  const wilayahId = isUuidLike(params.wilayah) ? params.wilayah : undefined;
  const statusFilter = ATTENDANCE_STATUS_KEYS.includes(params.status as never)
    ? (params.status as (typeof ATTENDANCE_STATUS_KEYS)[number])
    : null;

  const supabase = await createClient();

  const [
    { data: overview, error: overviewError },
    { data: periodStats, error: periodError },
    { data: recentEvents, error: recentError },
    { data: availableYears },
    { data: byWilayah },
    { data: eventOptions },
    { data: wilayahOptions },
  ] = await Promise.all([
    supabase
      .rpc("monitoring_overview", { p_year: year, p_event_id: eventId, p_wilayah_id: wilayahId })
      .single(),
    supabase.rpc("monitoring_period_stats", {
      p_year: year,
      p_event_id: eventId,
      p_wilayah_id: wilayahId,
    }),
    supabase.rpc("monitoring_recent_events", {
      p_limit: 10,
      p_year: year,
      p_wilayah_id: wilayahId,
    }),
    supabase.rpc("monitoring_available_years"),
    supabase.rpc("alumni_stats_by_wilayah"),
    supabase.from("events").select("id, title").order("start_at", { ascending: false }),
    supabase.from("wilayah").select("id, nama").order("nama"),
  ]);

  const years = (availableYears ?? []).map((y) => y.year).filter((y): y is number => y !== null);
  const displayYear = year ?? new Date().getFullYear();

  const criticalError = overviewError || periodError || recentError;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard Monitoring</h1>
        <p className="text-sm text-muted-foreground">
          Read-only. Tidak ada aksi CRUD di halaman ini.
        </p>
      </div>

      <Suspense fallback={<Skeleton className="h-10 w-full" />}>
        <MonitoringFilters
          years={years}
          events={eventOptions ?? []}
          wilayahList={wilayahOptions ?? []}
        />
      </Suspense>

      {criticalError ? (
        <Card>
          <CardContent className="py-8 text-center text-sm text-destructive">
            Gagal memuat statistik: {criticalError.message}
          </CardContent>
        </Card>
      ) : (
        <>
          {/* 1. Ringkasan utama */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Alumni Aktif" value={overview?.total_alumni_aktif ?? 0} />
            <StatCard label="Alumni Nonaktif" value={overview?.total_alumni_nonaktif ?? 0} />
            <StatCard label="Total Kegiatan" value={overview?.total_events ?? 0} />
            <StatCard label="Kegiatan Wajib Hadir" value={overview?.total_mandatory_events ?? 0} />
            <StatCard label="Total Hadir" value={overview?.total_hadir ?? 0} />
            <StatCard label="Total Tidak Hadir" value={overview?.total_tidak_hadir ?? 0} />
            <StatCard label="Total Izin" value={overview?.total_izin ?? 0} />
            <StatCard label="Total Sakit" value={overview?.total_sakit ?? 0} />
          </div>

          {/* 2. Persentase kehadiran */}
          <section className="flex flex-col gap-3">
            <h2 className="text-lg font-semibold tracking-tight">Persentase Kehadiran</h2>
            {(() => {
              const hadir = overview?.total_hadir ?? 0;
              const tidakHadir = overview?.total_tidak_hadir ?? 0;
              const izin = overview?.total_izin ?? 0;
              const sakit = overview?.total_sakit ?? 0;
              const totalTercatat = hadir + tidakHadir + izin + sakit;

              if (totalTercatat === 0) {
                return (
                  <Card>
                    <CardContent className="py-8 text-center text-sm text-muted-foreground">
                      Belum ada data absensi untuk filter yang dipilih.
                    </CardContent>
                  </Card>
                );
              }

              const segments: DonutSegment[] = [
                {
                  key: "HADIR",
                  label: ATTENDANCE_STATUS_LABEL.HADIR,
                  value: hadir,
                  colorHex: ATTENDANCE_STATUS_CHART_COLOR.HADIR.hex,
                  colorClass: ATTENDANCE_STATUS_CHART_COLOR.HADIR.className,
                },
                {
                  key: "TIDAK_HADIR",
                  label: ATTENDANCE_STATUS_LABEL.TIDAK_HADIR,
                  value: tidakHadir,
                  colorHex: ATTENDANCE_STATUS_CHART_COLOR.TIDAK_HADIR.hex,
                  colorClass: ATTENDANCE_STATUS_CHART_COLOR.TIDAK_HADIR.className,
                },
                {
                  key: "IZIN",
                  label: ATTENDANCE_STATUS_LABEL.IZIN,
                  value: izin,
                  colorHex: ATTENDANCE_STATUS_CHART_COLOR.IZIN.hex,
                  colorClass: ATTENDANCE_STATUS_CHART_COLOR.IZIN.className,
                },
                {
                  key: "SAKIT",
                  label: ATTENDANCE_STATUS_LABEL.SAKIT,
                  value: sakit,
                  colorHex: ATTENDANCE_STATUS_CHART_COLOR.SAKIT.hex,
                  colorClass: ATTENDANCE_STATUS_CHART_COLOR.SAKIT.className,
                },
              ];

              // "Belum Absen" cuma valid secara matematis kalau filter kegiatan
              // spesifik dipilih - lintas banyak kegiatan sekaligus, satu
              // alumni bisa hadir di satu acara dan tidak di acara lain,
              // sehingga "belum absen" agregat tidak punya arti tunggal.
              if (eventId) {
                const belumAbsen = Math.max(
                  0,
                  (overview?.total_alumni_aktif ?? 0) - totalTercatat,
                );
                segments.push({
                  key: "BELUM_ABSEN",
                  label: BELUM_ABSEN_LABEL,
                  value: belumAbsen,
                  colorHex: ATTENDANCE_STATUS_CHART_COLOR.BELUM_ABSEN.hex,
                  colorClass: ATTENDANCE_STATUS_CHART_COLOR.BELUM_ABSEN.className,
                });
              }

              return (
                <Card>
                  <CardContent className="py-6">
                    <DonutChart segments={segments} centerLabel="Tercatat" />
                  </CardContent>
                </Card>
              );
            })()}
          </section>

          {/* 3. Grafik */}
          <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Card>
              <CardContent className="flex flex-col gap-3">
                <h3 className="font-semibold tracking-tight">Distribusi Alumni per Wilayah</h3>
                {!byWilayah || byWilayah.length === 0 ? (
                  <p className="py-6 text-center text-sm text-muted-foreground">
                    Belum ada data wilayah.
                  </p>
                ) : (
                  <GroupedBarChart
                    data={byWilayah.map((w) => ({
                      label: w.wilayah_nama,
                      values: { total: w.total },
                    }))}
                    series={[{ key: "total", label: "Total Alumni", colorClass: "bg-primary" }]}
                  />
                )}
              </CardContent>
            </Card>

            <Card>
              <CardContent className="flex flex-col gap-3">
                <h3 className="font-semibold tracking-tight">
                  Statistik Absensi Bulanan ({displayYear})
                </h3>
                {!periodStats || periodStats.every((p) => p.hadir + p.tidak_hadir + p.izin + p.sakit === 0) ? (
                  <p className="py-6 text-center text-sm text-muted-foreground">
                    Belum ada data absensi pada tahun {displayYear}.
                  </p>
                ) : (
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
                    series={(statusFilter ? [statusFilter] : ATTENDANCE_STATUS_KEYS).map((key) => ({
                      key,
                      label: ATTENDANCE_STATUS_LABEL[key],
                      colorClass: ATTENDANCE_STATUS_CHART_COLOR[key].className,
                    }))}
                  />
                )}
              </CardContent>
            </Card>

            <Card className="lg:col-span-2">
              <CardContent className="flex flex-col gap-3">
                <h3 className="font-semibold tracking-tight">
                  Statistik Kegiatan per Periode ({displayYear})
                </h3>
                {!periodStats || periodStats.every((p) => p.total_events === 0) ? (
                  <p className="py-6 text-center text-sm text-muted-foreground">
                    Belum ada kegiatan pada tahun {displayYear}.
                  </p>
                ) : (
                  <GroupedBarChart
                    data={periodStats.map(
                      (p): BarChartDatum => ({
                        label: MONTH_LABELS[p.month - 1],
                        values: {
                          total: p.total_events,
                          wajib: p.total_mandatory_events,
                        },
                      }),
                    )}
                    series={[
                      { key: "total", label: "Total Kegiatan", colorClass: "bg-primary" },
                      { key: "wajib", label: "Wajib Hadir", colorClass: "bg-amber-500" },
                    ]}
                  />
                )}
              </CardContent>
            </Card>
          </section>

          {/* 5. Tabel ringkasan kegiatan terbaru */}
          <section className="flex flex-col gap-3">
            <h2 className="text-lg font-semibold tracking-tight">Kegiatan Terbaru</h2>
            <RecentEventsTable events={recentEvents ?? []} />
          </section>
        </>
      )}

      <p className="text-xs text-muted-foreground">
        Butuh detail lebih lanjut?{" "}
        <Link href="/monitoring/laporan" className="underline">
          Lihat Laporan Detail
        </Link>{" "}
        (segera hadir).
      </p>
    </div>
  );
}
