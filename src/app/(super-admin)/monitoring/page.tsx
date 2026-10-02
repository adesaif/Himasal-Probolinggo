import Link from "next/link";
import {
  CalendarCheck2,
  CircleAlert,
  CircleDashed,
  Eye,
  Percent,
  UserCheck,
  UserRoundX,
  Users,
  UserX,
} from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  AccountPanel,
  AttendanceTrendPanel,
  EventMonthlyPanel,
  EventStatsGrid,
  KecamatanPanel,
  KpiCard,
  RecentActivityPanel,
  RecentEventsPanel,
  SectionTitle,
  StatusPanel,
  YearTabs,
  listHref,
  type DrillLinks,
} from "@/components/analytics/activity-panels";
import { formatPercent, parseYearParam } from "@/lib/alumni-activity";

// Drill-down Super Admin - semua tujuan read-only di /monitoring.
const LINKS: DrillLinks = {
  alumniList: (query) => listHref("/monitoring/alumni", query),
  alumni: (id) => `/monitoring/alumni/${id}`,
  event: (id) => `/monitoring/kegiatan/${id}`,
};

export default async function MonitoringDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ tahun?: string }>;
}) {
  const { tahun } = await searchParams;
  const supabase = await createClient();
  const { data: yearRows } = await supabase.rpc("monitoring_available_years");
  const years = (yearRows ?? []).map((y) => y.year);
  const currentYear = years[0] ?? new Date().getFullYear();
  const requested = parseYearParam(tahun);
  const year = requested && years.includes(requested) ? requested : currentYear;

  // Satu sumber data dengan Admin Dashboard (RPC yang sama), read-only.
  const [
    { data: summary, error: summaryError },
    { data: byKecamatan, error: byKecamatanError },
    { data: overview, error: overviewError },
    { data: periodStats, error: periodError },
    { data: recentEvents },
    { data: activity },
  ] = await Promise.all([
    supabase.rpc("monitoring_alumni_summary", { p_year: year }).single(),
    supabase.rpc("monitoring_alumni_by_kecamatan", { p_year: year }),
    supabase.rpc("monitoring_overview", { p_year: year }).single(),
    supabase.rpc("monitoring_period_stats", { p_year: year }),
    supabase.rpc("monitoring_recent_events", { p_limit: 6, p_year: year }),
    supabase.rpc("monitoring_recent_activity", { p_limit: 8 }),
  ]);

  const error = summaryError || byKecamatanError || overviewError || periodError;
  const withYear = (query: Record<string, string>) =>
    LINKS.alumniList(year !== currentYear ? { ...query, tahun: String(year) } : query);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Monitoring HIMASAL</h1>
            <Badge variant="primary" className="gap-1">
              <Eye className="size-3" />
              Read-only
            </Badge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Keaktifan Alumni, kehadiran, dan kegiatan - dihitung otomatis dari riwayat absensi.
          </p>
        </div>
        <YearTabs
          years={years}
          current={year}
          currentYear={currentYear}
          hrefFor={(y) => (y === currentYear ? "/monitoring" : `/monitoring?tahun=${y}`)}
        />
      </div>

      {error || !summary || !overview ? (
        <Card>
          <CardContent className="py-8 text-center text-sm text-destructive">
            Gagal memuat data monitoring: {error?.message ?? "data tidak tersedia"}
          </CardContent>
        </Card>
      ) : (
        <>
          <section className="flex flex-col gap-3">
            <SectionTitle
              title={summary.is_final ? `Rekap Final ${year}` : `Tahun Berjalan ${year}`}
              description={
                summary.is_final
                  ? "Status final: kehadiran ≥ 50% = Aktif, < 50% = Tidak Aktif."
                  : "Status sementara berlaku selama tahun berjalan. Klik kartu untuk melihat Alumni di baliknya."
              }
            />
            <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
              <KpiCard
                label="Total Alumni"
                value={summary.total_alumni}
                icon={Users}
                href={withYear({})}
                hint="Lihat semua Alumni"
                accent
              />
              <KpiCard
                label="Aktif"
                value={summary.status_aktif}
                icon={UserCheck}
                tone="text-green-600 dark:text-green-400"
                href={withYear({ status: "aktif" })}
                hint="Kehadiran ≥ 50%"
              />
              <KpiCard
                label="Tidak Aktif"
                value={summary.status_tidak_aktif}
                icon={UserX}
                tone="text-red-600 dark:text-red-400"
                href={withYear({ status: "tidak_aktif" })}
                hint="Kehadiran < 50%"
              />
              <KpiCard
                label="Tidak Aktif (Sementara)"
                value={summary.status_sementara}
                icon={CircleAlert}
                tone="text-amber-600 dark:text-amber-400"
                href={withYear({ status: "tidak_aktif_sementara" })}
                hint="Absen 2 bulan terakhir"
              />
              <KpiCard
                label="Belum ada aktivitas"
                value={summary.status_belum_ada_data}
                icon={CircleDashed}
                href={withYear({ status: "belum_ada_data" })}
                hint="Belum ada kegiatan dihitung"
              />
              <KpiCard
                label="Kegiatan terlaksana"
                value={overview.kegiatan_terlaksana}
                icon={CalendarCheck2}
                href={year !== currentYear ? `/monitoring/kegiatan?tahun=${year}` : "/monitoring/kegiatan"}
                hint={`${overview.kegiatan_akan_datang} akan datang`}
              />
              <KpiCard
                label="Tingkat kehadiran"
                value={formatPercent(overview.tingkat_kehadiran)}
                icon={Percent}
                hint={
                  overview.total_slot > 0
                    ? `${overview.hadir} hadir dari ${overview.total_slot} kehadiran`
                    : "Belum ada data aktivitas"
                }
              />
              <KpiCard
                label="Belum punya akun"
                value={summary.akun_belum_ada}
                icon={UserRoundX}
                href={LINKS.alumniList({ akun: "belum" })}
                hint="Lihat daftar"
              />
            </div>
          </section>

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-3 xl:items-start">
            <AttendanceTrendPanel
              stats={periodStats ?? []}
              year={year}
              className="xl:col-span-2"
            />
            <RecentActivityPanel items={activity ?? []} links={LINKS} />
          </div>

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-3 xl:items-start">
            <KecamatanPanel
              rows={byKecamatan ?? []}
              year={year}
              isFinal={summary.is_final}
              links={LINKS}
            />
            <div className="flex min-w-0 flex-col gap-4 xl:col-span-2">
              <div className="grid grid-cols-1 gap-4">
                <StatusPanel summary={summary} links={LINKS} />
                <AccountPanel summary={summary} links={LINKS} />
              </div>
              <RecentEventsPanel
                events={recentEvents ?? []}
                eventHref={LINKS.event}
                action={
                  <Button variant="ghost" size="sm" asChild>
                    <Link href={year !== currentYear ? `/monitoring/kegiatan?tahun=${year}` : "/monitoring/kegiatan"}>
                      Semua kegiatan
                    </Link>
                  </Button>
                }
              />
            </div>
          </div>

          <section className="flex flex-col gap-3">
            <SectionTitle
              title={`Monitoring Kegiatan ${year}`}
              description="Hanya kegiatan yang sudah terlaksana yang dihitung."
              action={
                <Button variant="outline" size="sm" asChild>
                  <Link href={year !== currentYear ? `/monitoring/kegiatan?tahun=${year}` : "/monitoring/kegiatan"}>
                    Semua kegiatan
                  </Link>
                </Button>
              }
            />
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-2 xl:items-start">
              <EventStatsGrid overview={overview} />
              <EventMonthlyPanel stats={periodStats ?? []} year={year} />
            </div>
          </section>
        </>
      )}
    </div>
  );
}
