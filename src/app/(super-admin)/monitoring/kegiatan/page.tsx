import { createClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import {
  EventStatsGrid,
  RecentEventsPanel,
  YearTabs,
} from "@/components/analytics/activity-panels";
import { parseYearParam } from "@/lib/alumni-activity";

export default async function MonitoringKegiatanPage({
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

  const [{ data: overview, error }, { data: events }] = await Promise.all([
    supabase.rpc("monitoring_overview", { p_year: year }).single(),
    supabase.rpc("monitoring_recent_events", { p_limit: 50, p_year: year }),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Kegiatan & Absensi</h1>
          <p className="text-sm text-muted-foreground">
            Semua kegiatan {year}. Kehadiran hanya dihitung untuk kegiatan yang sudah terlaksana.
          </p>
        </div>
        <YearTabs
          years={years}
          current={year}
          currentYear={currentYear}
          hrefFor={(y) => (y === currentYear ? "/monitoring/kegiatan" : `/monitoring/kegiatan?tahun=${y}`)}
        />
      </div>

      {error || !overview ? (
        <Card>
          <CardContent className="py-8 text-center text-sm text-destructive">
            Gagal memuat data: {error?.message ?? "data tidak tersedia"}
          </CardContent>
        </Card>
      ) : (
        <>
          <EventStatsGrid overview={overview} />
          <RecentEventsPanel
            title={`Daftar Kegiatan ${year}`}
            events={events ?? []}
            eventHref={(id) => `/monitoring/kegiatan/${id}`}
          />
        </>
      )}
    </div>
  );
}
