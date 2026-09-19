import { createClient } from "@/lib/supabase/server";
import { StatCard } from "@/components/shared/stat-card";
import { Card, CardContent } from "@/components/ui/card";

export default async function MonitoringDashboardPage() {
  const supabase = await createClient();

  const [{ data: stats, error: statsError }, { data: byWilayah }] =
    await Promise.all([
      supabase.rpc("alumni_stats").single(),
      supabase.rpc("alumni_stats_by_wilayah"),
    ]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Dashboard Monitoring
        </h1>
        <p className="text-sm text-muted-foreground">
          Read-only. Tidak ada aksi CRUD di halaman ini.
        </p>
      </div>

      {statsError ? (
        <Card>
          <CardContent className="py-8 text-center text-sm text-destructive">
            Gagal memuat statistik: {statsError.message}
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <StatCard label="Total Alumni" value={stats?.total ?? 0} />
            <StatCard label="Alumni Aktif" value={stats?.aktif ?? 0} />
            <StatCard label="Alumni Nonaktif" value={stats?.nonaktif ?? 0} />
          </div>

          <div>
            <h2 className="mb-3 text-lg font-semibold tracking-tight">
              Distribusi per Wilayah
            </h2>
            {!byWilayah || byWilayah.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Belum ada data wilayah.
              </p>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                {byWilayah.map((w) => (
                  <StatCard
                    key={w.wilayah_id}
                    label={w.wilayah_nama}
                    value={w.total}
                  />
                ))}
              </div>
            )}
          </div>
        </>
      )}

      <p className="text-xs text-muted-foreground">
        Statistik kehadiran dan grafik bulanan akan tersedia setelah modul
        absensi dibangun.
      </p>
    </div>
  );
}
