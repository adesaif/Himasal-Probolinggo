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
} from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { AdminStatCard } from "@/components/admin/admin-stat-card";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RecentEventsTable } from "@/components/monitoring/recent-events-table";
import { AdminDashboardCharts } from "@/components/admin/admin-dashboard-charts";
import { formatEventRange, formatDateID } from "@/lib/format-date";

const QUICK_ACTIONS = [
  { href: "/admin/alumni", label: "Alumni", icon: Users },
  { href: "/admin/berita", label: "Berita", icon: Newspaper },
  { href: "/admin/agenda", label: "Agenda", icon: CalendarDays },
  { href: "/admin/galeri", label: "Galeri", icon: Images },
  { href: "/admin/absensi", label: "Absensi", icon: QrCode },
  { href: "/admin/konten/topik", label: "Topik", icon: ListTree },
];

export default async function AdminDashboardPage() {
  const supabase = await createClient();
  const year = new Date().getFullYear();

  // Dashboard yang sama untuk SEMUA Admin (Admin Pusat maupun Admin yang
  // diangkat) - RPC yang sama dengan /monitoring, definisi Aktif = pernah
  // tercatat HADIR (alumni_is_aktif), distribusi per Kecamatan master.
  const [
    { data: alumniSummary, error: alumniSummaryError },
    { data: byKecamatan, error: byKecamatanError },
    { data: periodStats, error: periodError },
    { data: recentEvents },
    { data: nextEvent },
    { data: recentNews },
    { data: recentGallery },
  ] = await Promise.all([
    supabase.rpc("monitoring_alumni_summary").single(),
    supabase.rpc("monitoring_alumni_by_kecamatan"),
    supabase.rpc("monitoring_period_stats", { p_year: year }),
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

  const statsError = alumniSummaryError || byKecamatanError || periodError;
  const summary = {
    total_alumni: alumniSummary?.total_alumni ?? 0,
    alumni_aktif: alumniSummary?.alumni_aktif ?? 0,
    alumni_tidak_aktif: alumniSummary?.alumni_tidak_aktif ?? 0,
    akun_belum_ada: alumniSummary?.akun_belum_ada ?? 0,
    akun_undangan_terkirim: alumniSummary?.akun_undangan_terkirim ?? 0,
    akun_menunggu_password: alumniSummary?.akun_menunggu_password ?? 0,
    akun_aktif: alumniSummary?.akun_aktif ?? 0,
  };

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

      {statsError ? (
        <Card>
          <CardContent className="py-8 text-center text-sm text-destructive">
            Gagal memuat statistik: {statsError.message}
          </CardContent>
        </Card>
      ) : (
        <>
          <section className="flex flex-col gap-3">
            <div>
              <h2 className="text-lg font-semibold tracking-tight">Ringkasan Alumni</h2>
              <p className="text-sm text-muted-foreground">
                Aktif = pernah tercatat hadir di minimal satu agenda.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 xl:grid-cols-5">
              <AdminStatCard label="Total Alumni" value={summary.total_alumni} icon={Users} />
              <AdminStatCard
                label="Alumni Aktif"
                value={summary.alumni_aktif}
                icon={UserCheck}
                emphasis
              />
              <AdminStatCard
                label="Alumni Tidak Aktif"
                value={summary.alumni_tidak_aktif}
                icon={UserX}
              />
              <AdminStatCard
                label="Sudah Punya Akun"
                value={summary.total_alumni - summary.akun_belum_ada}
                icon={KeyRound}
              />
              <AdminStatCard
                label="Belum Punya Akun"
                value={summary.akun_belum_ada}
                icon={UserRoundX}
              />
            </div>
          </section>

          <AdminDashboardCharts
            summary={summary}
            byKecamatan={(byKecamatan ?? []).map((r) => ({
              id: r.kecamatan_id,
              nama: r.kecamatan_nama,
              total: r.total,
            }))}
            latestEvent={recentEvents?.[0] ?? null}
            periodStats={periodStats ?? []}
            year={year}
          />

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

          <section className="flex flex-col gap-3">
            <h2 className="text-lg font-semibold tracking-tight">Ringkasan Absensi Terbaru</h2>
            <RecentEventsTable
              events={recentEvents ?? []}
              emptyMessage="Belum ada kegiatan dengan data absensi."
            />
          </section>
        </>
      )}
    </div>
  );
}
