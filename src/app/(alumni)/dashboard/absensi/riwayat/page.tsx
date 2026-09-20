import Link from "next/link";

import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatDateTimeID } from "@/lib/format-date";
import {
  ATTENDANCE_STATUS_BADGE_CLASS,
  ATTENDANCE_STATUS_LABEL,
} from "@/lib/attendance";

const PAGE_SIZE = 10;

export default async function AlumniRiwayatAbsensiPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const { page: pageParam } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  // RLS (attendance_select_own) sudah membatasi baris ke milik alumni yang
  // sedang login - tidak perlu filter alumni_id manual di sini.
  const {
    data: records,
    error,
    count,
  } = await supabase
    .from("attendance_records")
    .select("id, status, scanned_at, created_at, notes, event:event_id(title, start_at)", {
      count: "exact",
    })
    .order("created_at", { ascending: false })
    .range(from, to);

  const totalPages = Math.max(1, Math.ceil((count ?? 0) / PAGE_SIZE));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Riwayat Absensi
          </h1>
          <p className="text-sm text-muted-foreground">
            Riwayat kehadiran Anda pada setiap kegiatan HIMASAL.
          </p>
        </div>
        <Button variant="outline" asChild>
          <Link href="/dashboard/absensi">Kembali</Link>
        </Button>
      </div>

      {error ? (
        <Card>
          <CardContent className="py-8 text-center text-sm text-destructive">
            Gagal memuat riwayat: {error.message}
          </CardContent>
        </Card>
      ) : !records || records.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            Belum ada riwayat absensi.
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-2">
          {records.map((record) => (
            <Card key={record.id}>
              <CardContent className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="truncate font-medium">
                    {record.event?.title ?? "Kegiatan tidak diketahui"}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {record.event?.start_at
                      ? formatDateTimeID(record.event.start_at)
                      : "-"}
                    {record.scanned_at
                      ? ` · Absen: ${formatDateTimeID(record.scanned_at)}`
                      : ""}
                  </p>
                  {record.notes ? (
                    <p className="text-xs text-muted-foreground">
                      Catatan: {record.notes}
                    </p>
                  ) : null}
                </div>
                <span
                  className={
                    ATTENDANCE_STATUS_BADGE_CLASS[record.status] ??
                    "rounded-full bg-neutral-100 px-2.5 py-0.5 text-xs font-medium"
                  }
                >
                  {ATTENDANCE_STATUS_LABEL[record.status] ?? record.status}
                </span>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {!error && (count ?? 0) > PAGE_SIZE ? (
        <div className="flex items-center justify-between text-sm">
          <p className="text-muted-foreground">
            Halaman {page} dari {totalPages}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              asChild={page > 1}
            >
              {page > 1 ? (
                <Link href={`/dashboard/absensi/riwayat?page=${page - 1}`}>
                  Sebelumnya
                </Link>
              ) : (
                <span>Sebelumnya</span>
              )}
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              asChild={page < totalPages}
            >
              {page < totalPages ? (
                <Link href={`/dashboard/absensi/riwayat?page=${page + 1}`}>
                  Berikutnya
                </Link>
              ) : (
                <span>Berikutnya</span>
              )}
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
