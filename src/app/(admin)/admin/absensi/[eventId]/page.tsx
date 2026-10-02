import { notFound } from "next/navigation";
import Link from "next/link";
import { QrCode } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AttendanceParticipantList } from "@/components/admin/attendance-participant-list";
import { CloseAttendanceButton } from "@/components/admin/close-attendance-button";
import { formatEventRange } from "@/lib/format-date";

export default async function AdminAbsensiEventDetailPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;
  const supabase = await createClient();

  const { data: event } = await supabase
    .from("events")
    .select("id, title, location, start_at, end_at, is_mandatory, status, attendance_closed_at")
    .eq("id", eventId)
    .single();

  if (!event) notFound();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{event.title}</h1>
          <p className="text-sm text-muted-foreground">
            {formatEventRange(event.start_at, event.end_at)}
            {event.location ? ` · ${event.location}` : ""}
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {event.is_mandatory ? <Badge variant="warning">Wajib Hadir</Badge> : null}
            <Badge variant={event.status === "published" ? "success" : "neutral"}>
              {event.status === "published" ? "Published" : "Draft"}
            </Badge>
            {event.attendance_closed_at ? (
              <span className="rounded-full bg-neutral-800 px-2.5 py-0.5 text-xs font-medium text-white dark:bg-neutral-200 dark:text-neutral-900">
                Absensi Ditutup
              </span>
            ) : null}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" asChild>
            <Link href={`/admin/absensi/${event.id}/qr`}>
              <QrCode />
              Tampilkan QR
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/admin/absensi">Kembali</Link>
          </Button>
        </div>
      </div>

      {event.is_mandatory ? (
        <CloseAttendanceButton
          eventId={event.id}
          startAt={event.start_at}
          endAt={event.end_at}
          closedAt={event.attendance_closed_at}
        />
      ) : null}

      <AttendanceParticipantList eventId={event.id} />
    </div>
  );
}
