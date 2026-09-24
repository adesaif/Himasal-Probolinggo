import Link from "next/link";
import {
  Users,
  UserCheck,
  CalendarCheck,
  CalendarX,
  ClipboardList,
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

  const [
    { data: alumniStats, error: alumniStatsError },
    { data: byWilayah },
    { data: overview, error: overviewError },
    { data: recentEvents },
    { data: nextEvent },
    { data: recentNews },
    { data: recentGallery },
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
    supabase
      .from("news")
      .select("id, slug, title, thumbnail_url, category, published_at, status")
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

  const statsError = alumniStatsError || overviewError;

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
          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 xl:grid-cols-6">
            <AdminStatCard
              label="Alumni Aktif"
              value={alumniStats?.aktif ?? 0}
              icon={UserCheck}
              emphasis
            />
            <AdminStatCard label="Alumni Nonaktif" value={alumniStats?.nonaktif ?? 0} icon={Users} />
            <AdminStatCard label="Total Kegiatan" value={overview?.total_events ?? 0} icon={CalendarDays} />
            <AdminStatCard label="Hadir" value={overview?.total_hadir ?? 0} icon={CalendarCheck} emphasis />
            <AdminStatCard label="Tidak Hadir" value={overview?.total_tidak_hadir ?? 0} icon={CalendarX} />
            <AdminStatCard
              label="Izin/Sakit"
              value={(overview?.total_izin ?? 0) + (overview?.total_sakit ?? 0)}
              icon={ClipboardList}
            />
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
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

            <section className="flex flex-col gap-3">
              <h2 className="text-lg font-semibold tracking-tight">Distribusi Alumni per Wilayah</h2>
              {!byWilayah || byWilayah.length === 0 ? (
                <Card>
                  <CardContent className="py-6 text-center text-sm text-muted-foreground">
                    Belum ada data wilayah.
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardContent className="flex flex-col gap-2.5">
                    {byWilayah.map((w) => (
                      <div key={w.wilayah_id} className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">{w.wilayah_nama}</span>
                        <span className="font-medium tabular-nums">{w.total}</span>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}
            </section>
          </div>

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
                        href={`/admin/berita?category=${item.category ?? ""}`}
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
                            {item.category ? `${item.category} · ` : ""}
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
