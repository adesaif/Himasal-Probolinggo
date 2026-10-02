import { notFound } from "next/navigation";
import Link from "next/link";

import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { AttendanceQrDisplay } from "@/components/admin/attendance-qr-display";
import { formatEventRange } from "@/lib/format-date";

export default async function AdminAbsensiEventQrPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;
  const supabase = await createClient();

  const { data: event } = await supabase
    .from("events")
    .select("id, title, start_at, end_at, status, attendance_closed_at")
    .eq("id", eventId)
    .single();

  if (!event) notFound();

  return (
    <div className="mx-auto flex max-w-md flex-col gap-4">
      <div className="text-center">
        <h1 className="text-2xl font-semibold tracking-tight">{event.title}</h1>
        <p className="text-sm text-muted-foreground">
          {formatEventRange(event.start_at, event.end_at)}
        </p>
      </div>

      {event.status !== "published" ? (
        <p className="text-center text-sm text-destructive">
          Event ini belum published. Publikasikan terlebih dahulu di menu Agenda
          sebelum membuat QR absensi.
        </p>
      ) : event.attendance_closed_at ? (
        <p className="text-center text-sm text-muted-foreground">
          Absensi untuk kegiatan ini sudah ditutup - QR tidak bisa dibuat lagi.
        </p>
      ) : (
        <AttendanceQrDisplay eventId={event.id} />
      )}

      <Button variant="outline" asChild className="mx-auto">
        <Link href={`/admin/absensi/${event.id}`}>Kembali ke Detail</Link>
      </Button>
    </div>
  );
}
