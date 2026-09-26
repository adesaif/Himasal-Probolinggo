import Link from "next/link";
import { QrCode, History } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatEventRange } from "@/lib/format-date";
import {
  ATTENDANCE_STATUS_BADGE_CLASS,
  ATTENDANCE_STATUS_LABEL,
  BELUM_ABSEN_BADGE_CLASS,
} from "@/lib/attendance";

export default async function AlumniAbsensiPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: events, error } = await supabase
    .from("events")
    .select("id, title, location, start_at, end_at, is_mandatory")
    .eq("status", "published")
    .order("start_at", { ascending: true })
    .limit(10);

  const eventIds = (events ?? []).map((event) => event.id);

  const { data: myAttendance } =
    eventIds.length > 0
      ? await supabase
          .from("attendance_records")
          .select("event_id, status")
          .in("event_id", eventIds)
      : { data: [] };

  const statusByEvent = new Map(
    (myAttendance ?? []).map((a) => [a.event_id, a.status]),
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Absensi</h1>
          <p className="text-sm text-muted-foreground">
            Pindai QR untuk mencatat kehadiran pada kegiatan HIMASAL.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild>
            <Link href="/dashboard/absensi/scan">
              <QrCode />
              Scan QR
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/dashboard/absensi/riwayat">
              <History />
              Riwayat
            </Link>
          </Button>
        </div>
      </div>

      <div>
        <h2 className="mb-3 text-lg font-semibold tracking-tight">
          Kegiatan Terbaru
        </h2>

        {error ? (
          <Card>
            <CardContent className="py-8 text-center text-sm text-destructive">
              Gagal memuat kegiatan. Silakan coba lagi nanti.
            </CardContent>
          </Card>
        ) : !events || events.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-sm text-muted-foreground">
              Belum ada kegiatan yang dipublikasikan.
            </CardContent>
          </Card>
        ) : (
          <div className="flex flex-col gap-2">
            {events.map((event) => {
              const status = statusByEvent.get(event.id);
              return (
                <Card key={event.id}>
                  <CardContent className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate font-medium">{event.title}</p>
                        {event.is_mandatory ? <Badge variant="warning">Wajib Hadir</Badge> : null}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {formatEventRange(event.start_at, event.end_at)}
                        {event.location ? ` · ${event.location}` : ""}
                      </p>
                    </div>
                    <span
                      className={
                        status
                          ? (ATTENDANCE_STATUS_BADGE_CLASS[status] ?? BELUM_ABSEN_BADGE_CLASS)
                          : BELUM_ABSEN_BADGE_CLASS
                      }
                    >
                      {status ? (ATTENDANCE_STATUS_LABEL[status] ?? status) : "Belum Absen"}
                    </span>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
