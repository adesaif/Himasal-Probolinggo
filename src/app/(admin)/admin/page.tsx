import Link from "next/link";
import { Newspaper, CalendarDays, Images, QrCode, Users } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { StatCard } from "@/components/shared/stat-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { RecentEventsTable } from "@/components/monitoring/recent-events-table";
import { formatEventRange } from "@/lib/format-date";

export default async function AdminDashboardPage() {
  const supabase = await createClient();

  const [
    { data: alumniStats, error: alumniStatsError },
    { data: byWilayah },
    { data: overview, error: overviewError },
    { data: recentEvents },
    { data: nextEvent },
  ] = await Promise.all([
    supabase.rpc("alumni_stats").single(),
    supabase.rpc("alumni_stats_by_wilayah"),
    supabase.rpc("monitoring_overview", {}).single(),
    supabase.rpc("monitoring_recent_events", { p_limit: 5 }),
    supabase
      .from("events")
      .select("id, title, location, start_at, end_at, is_mandatory")
      .eq("status", "published")
      .gte("start_at", new Date().toISOString())
      .order("start_at", { ascending: true })
      .limit(1)
      .maybeSingle(),
  ]);

  const statsError = alumniStatsError || overviewError;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard Admin</h1>
        <div className="flex flex-wrap gap-2">
          <Button asChild size="sm">
            <Link href="/admin/alumni">
              <Users />
              Alumni
            </Link>
          </Button>
          <Button variant="outline" asChild size="sm">
            <Link href="/admin/berita">
              <Newspaper />
              Berita
            </Link>
          </Button>
          <Button variant="outline" asChild size="sm">
            <Link href="/admin/agenda">
              <CalendarDays />
              Agenda
            </Link>
          </Button>
          <Button variant="outline" asChild size="sm">
            <Link href="/admin/galeri">
              <Images />
              Galeri
            </Link>
          </Button>
          <Button variant="outline" asChild size="sm">
            <Link href="/admin/absensi">
              <QrCode />
              Absensi
            </Link>
          </Button>
        </div>
      </div>

      {statsError ? (
        <Card>
          <CardContent className="py-8 text-center text-sm text-destructive">
            Gagal memuat statistik: {statsError.message}
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            <StatCard label="Alumni Aktif" value={alumniStats?.aktif ?? 0} />
            <StatCard label="Alumni Nonaktif" value={alumniStats?.nonaktif ?? 0} />
            <StatCard label="Total Kegiatan" value={overview?.total_events ?? 0} />
            <StatCard label="Hadir" value={overview?.total_hadir ?? 0} />
            <StatCard label="Tidak Hadir" value={overview?.total_tidak_hadir ?? 0} />
            <StatCard label="Izin/Sakit" value={(overview?.total_izin ?? 0) + (overview?.total_sakit ?? 0)} />
          </div>

          <div>
            <h2 className="mb-3 text-lg font-semibold tracking-tight">Kegiatan Terdekat</h2>
            {!nextEvent ? (
              <Card>
                <CardContent className="py-6 text-center text-sm text-muted-foreground">
                  Tidak ada kegiatan mendatang yang dipublikasikan.
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium">{nextEvent.title}</p>
                      {nextEvent.is_mandatory ? (
                        <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
                          Wajib Hadir
                        </span>
                      ) : null}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {formatEventRange(nextEvent.start_at, nextEvent.end_at)}
                      {nextEvent.location ? ` · ${nextEvent.location}` : ""}
                    </p>
                  </div>
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/admin/absensi/${nextEvent.id}`}>Kelola Absensi</Link>
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>

          <div>
            <h2 className="mb-3 text-lg font-semibold tracking-tight">
              Distribusi Alumni per Wilayah
            </h2>
            {!byWilayah || byWilayah.length === 0 ? (
              <p className="text-sm text-muted-foreground">Belum ada data wilayah.</p>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                {byWilayah.map((w) => (
                  <StatCard key={w.wilayah_id} label={w.wilayah_nama} value={w.total} />
                ))}
              </div>
            )}
          </div>

          <div>
            <h2 className="mb-3 text-lg font-semibold tracking-tight">
              Ringkasan Absensi Terbaru
            </h2>
            <RecentEventsTable
              events={recentEvents ?? []}
              emptyMessage="Belum ada kegiatan dengan data absensi."
            />
          </div>
        </>
      )}
    </div>
  );
}
