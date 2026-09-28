import Link from "next/link";
import {
  Users,
  UserCheck,
  UserX,
  KeyRound,
  UserRoundX,
  CalendarDays,
  Newspaper,
  Images,
  QrCode,
  ListTree,
  CircleDashed,
  CircleAlert,
} from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  AccountPanel,
  AttendanceTrendPanel,
  EventMonthlyPanel,
  EventStatsGrid,
  KecamatanPanel,
  KpiCard,
  RecentEventsPanel,
  SectionTitle,
  StatusPanel,
  listHref,
  type DrillLinks,
} from "@/components/analytics/activity-panels";
import { formatEventRange, formatDateID } from "@/lib/format-date";

const QUICK_ACTIONS = [
  { href: "/admin/alumni", label: "Alumni", icon: Users },
  { href: "/admin/berita", label: "Berita", icon: Newspaper },
  { href: "/admin/agenda", label: "Agenda", icon: CalendarDays },
  { href: "/admin/galeri", label: "Galeri", icon: Images },
  { href: "/admin/absensi", label: "Absensi", icon: QrCode },
  { href: "/admin/konten/topik", label: "Topik", icon: ListTree },
];

// Drill-down Admin: angka -> daftar Alumni terfilter -> master detail.
const LINKS: DrillLinks = {
  alumniList: (query) => listHref("/admin/alumni", query),
  alumni: (id) => `/admin/alumni/${id}`,
  event: (id) => `/admin/absensi/${id}`,
};

export default async function AdminDashboardPage() {
  const supabase = await createClient();

  // Dashboard yang sama untuk SEMUA Admin (Admin Pusat maupun Admin yang
  // diangkat) dan sumber data yang sama dengan Super Admin Monitoring:
  // status keaktifan dihitung di database dari riwayat kehadiran
  // (alumni_activity_stats) untuk tahun berjalan.
  const [
    { data: summary, error: summaryError },
    { data: byKecamatan, error: byKecamatanError },
    { data: overview, error: overviewError },
    { data: periodStats, error: periodError },
    { data: recentEvents },
    { data: nextEvent },
    { data: recentNews },
    { data: recentGallery },
  ] = await Promise.all([
    supabase.rpc("monitoring_alumni_summary").single(),
    supabase.rpc("monitoring_alumni_by_kecamatan"),
    supabase.rpc("monitoring_overview").single(),
    supabase.rpc("monitoring_period_stats"),
    supabase.rpc("monitoring_recent_events", { p_limit: 5 }),
    supabase
      .from("events")
      .select("id, title, location, start_at, end_at, is_mandatory")
      .eq("status", "published")
      .gte("start_at", new Date().toISOString())
      .order("start_at", { ascending: true })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("news")
      .select("id, slug, title, thumbnail_url, published_at, status, site_topics(label)")
      .eq("status", "published")
      .order("published_at", { ascending: false })
      .limit(3),
    supabase
      .from("gallery_items")
      .select("id, image_url, caption, created_at")
      .eq("is_published", true)
      .order("created_at", { ascending: false })
      .limit(3),
  ]);

  const statsError = summaryError || byKecamatanError || overviewError || periodError;

  return (
    <div className="flex flex-col gap-8">
      <AdminPageHeader
        title="Dashboard"
        description="Ringkasan aktivitas HIMASAL Probolinggo."
        actions={QUICK_ACTIONS.map(({ href, label, icon: Icon }) => (
          <Button key={href} variant="outline" size="sm" asChild>
            <Link href={href}>
              <Icon />
              {label}
            </Link>
          </Button>
        ))}
      />

      {statsError || !summary || !overview ? (
        <Card>
          <CardContent className="py-8 text-center text-sm text-destructive">
            Gagal memuat statistik: {statsError?.message ?? "data tidak tersedia"}
          </CardContent>
        </Card>
      ) : (
        <>
          <section className="flex flex-col gap-3">
            <SectionTitle
              title={`Ringkasan Alumni ${summary.tahun}`}
              description="Status dihitung otomatis dari riwayat kehadiran tahun berjalan. Klik angka untuk melihat daftar Alumni."
            />
            <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4">
              <KpiCard
                label="Total Alumni"
                value={summary.total_alumni}
                icon={Users}
                href={LINKS.alumniList({})}
                hint="Lihat semua"
                accent
              />
              <KpiCard
                label="Aktif"
                value={summary.status_aktif}
                icon={UserCheck}
                tone="text-green-600 dark:text-green-400"
                href={LINKS.alumniList({ status: "aktif" })}
                hint="Kehadiran ≥ 50%"
              />
              <KpiCard
                label="Tidak Aktif"
                value={summary.status_tidak_aktif}
                icon={UserX}
                tone="text-red-600 dark:text-red-400"
                href={LINKS.alumniList({ status: "tidak_aktif" })}
                hint="Kehadiran < 50%"
              />
              <KpiCard
                label="Tidak Aktif (Sementara)"
                value={summary.status_sementara}
                icon={CircleAlert}
                tone="text-amber-600 dark:text-amber-400"
                href={LINKS.alumniList({ status: "tidak_aktif_sementara" })}
                hint="Absen 2 bulan terakhir"
              />
              <KpiCard
                label="Belum ada data aktivitas"
                value={summary.status_belum_ada_data}
                icon={CircleDashed}
                href={LINKS.alumniList({ status: "belum_ada_data" })}
                hint="Belum ada kegiatan dihitung"
              />
              <KpiCard
                label="Sudah punya akun"
                value={summary.total_alumni - summary.akun_belum_ada}
                icon={KeyRound}
                href={LINKS.alumniList({ akun: "ada" })}
                hint="Lihat daftar"
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

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <StatusPanel summary={summary} links={LINKS} />
            <AccountPanel summary={summary} links={LINKS} />
          </div>

          <KecamatanPanel
            rows={byKecamatan ?? []}
            year={summary.tahun}
            isFinal={summary.is_final}
            links={LINKS}
          />

          <section className="flex flex-col gap-3">
            <SectionTitle
              title={`Statistik Kegiatan & Kehadiran ${overview.tahun}`}
              description="Hanya kegiatan yang sudah terlaksana; kegiatan mendatang tidak dihitung."
            />
            <EventStatsGrid overview={overview} />
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <AttendanceTrendPanel stats={periodStats ?? []} year={overview.tahun} />
              <EventMonthlyPanel stats={periodStats ?? []} year={overview.tahun} />
            </div>
            <RecentEventsPanel events={recentEvents ?? []} eventHref={LINKS.event} />
          </section>

          <section className="flex flex-col gap-3">
            <h2 className="text-lg font-semibold tracking-tight">Agenda Mendatang</h2>
            {!nextEvent ? (
              <Card>
                <CardContent className="py-6 text-center text-sm text-muted-foreground">
                  Tidak ada kegiatan mendatang yang dipublikasikan.
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="flex flex-col gap-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium">{nextEvent.title}</p>
                    {nextEvent.is_mandatory ? <Badge variant="warning">Wajib Hadir</Badge> : null}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {formatEventRange(nextEvent.start_at, nextEvent.end_at)}
                    {nextEvent.location ? ` · ${nextEvent.location}` : ""}
                  </p>
                  <Button variant="outline" size="sm" asChild className="w-fit">
                    <Link href={`/admin/absensi/${nextEvent.id}`}>Kelola Absensi</Link>
                  </Button>
                </CardContent>
              </Card>
            )}
          </section>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <section className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold tracking-tight">Berita Terbaru</h2>
                <Button variant="link" size="sm" asChild className="h-auto p-0">
                  <Link href="/admin/berita">Lihat semua</Link>
                </Button>
              </div>
              {!recentNews || recentNews.length === 0 ? (
                <Card>
                  <CardContent className="py-6 text-center text-sm text-muted-foreground">
                    Belum ada berita dipublikasikan.
                  </CardContent>
                </Card>
              ) : (
                <Card className="py-2">
                  <CardContent className="flex flex-col divide-y px-0">
                    {recentNews.map((item) => (
                      <Link
                        key={item.id}
                        href="/admin/berita"
                        className="flex items-center gap-3 px-6 py-3 transition-colors hover:bg-muted/50"
                      >
                        {item.thumbnail_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={item.thumbnail_url}
                            alt=""
                            className="size-12 shrink-0 rounded-md object-cover"
                          />
                        ) : (
                          <span className="flex size-12 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
                            <Newspaper className="size-4" />
                          </span>
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">{item.title}</p>
                          <p className="text-xs text-muted-foreground">
                            {item.site_topics?.label ? `${item.site_topics.label} · ` : ""}
                            {item.published_at ? formatDateID(item.published_at) : ""}
                          </p>
                        </div>
                      </Link>
                    ))}
                  </CardContent>
                </Card>
              )}
            </section>

            <section className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold tracking-tight">Galeri Terbaru</h2>
                <Button variant="link" size="sm" asChild className="h-auto p-0">
                  <Link href="/admin/galeri">Lihat semua</Link>
                </Button>
              </div>
              {!recentGallery || recentGallery.length === 0 ? (
                <Card>
                  <CardContent className="py-6 text-center text-sm text-muted-foreground">
                    Belum ada galeri dipublikasikan.
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-3 gap-3">
                  {recentGallery.map((item) => (
                    <Link
                      key={item.id}
                      href="/admin/galeri"
                      className="group relative aspect-square overflow-hidden rounded-lg border"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={item.image_url}
                        alt={item.caption ?? ""}
                        className="size-full object-cover transition-transform group-hover:scale-105"
                      />
                    </Link>
                  ))}
                </div>
              )}
            </section>
          </div>

        </>
      )}
    </div>
  );
}
