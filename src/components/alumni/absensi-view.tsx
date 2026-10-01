import Link from "next/link";
import { CalendarClock, History, MapPin, QrCode } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatEventRange } from "@/lib/format-date";
import {
  ATTENDANCE_STATUS_BADGE_CLASS,
  ATTENDANCE_STATUS_LABEL,
  BELUM_ABSEN_BADGE_CLASS,
  BELUM_ABSEN_LABEL,
} from "@/lib/attendance";

export type AbsensiEvent = {
  id: string;
  title: string;
  location: string | null;
  start_at: string;
  end_at: string | null;
  is_mandatory: boolean;
  attendance_closed_at: string | null;
};

function EventItem({ event, badge }: { event: AbsensiEvent; badge?: React.ReactNode }) {
  return (
    <li>
      <Card className="py-4">
        <CardContent className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <Link
                href={`/agenda/${event.id}`}
                className="font-medium break-words underline decoration-primary/40 underline-offset-4 hover:text-primary hover:decoration-primary"
              >
                {event.title}
              </Link>
              {event.is_mandatory ? <Badge variant="warning">Wajib Hadir</Badge> : null}
            </div>
            <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
              <CalendarClock className="size-4 shrink-0" aria-hidden="true" />
              {formatEventRange(event.start_at, event.end_at)}
            </p>
            {event.location ? (
              <p className="mt-0.5 flex items-center gap-1.5 text-sm text-muted-foreground">
                <MapPin className="size-4 shrink-0" aria-hidden="true" />
                <span className="break-words">{event.location}</span>
              </p>
            ) : null}
          </div>
          {badge ? <div className="shrink-0">{badge}</div> : null}
        </CardContent>
      </Card>
    </li>
  );
}

function Section({
  title,
  description,
  empty,
  children,
  count,
}: {
  title: string;
  description: string;
  empty: string;
  count: number;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-3">
      <div>
        <h2 className="text-lg font-semibold tracking-tight">
          {title}
          <span className="ml-2 text-sm font-normal text-muted-foreground">{count}</span>
        </h2>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      {count === 0 ? (
        <p className="rounded-xl border border-dashed px-4 py-6 text-center text-sm text-muted-foreground">
          {empty}
        </p>
      ) : (
        <ul className="flex flex-col gap-2">{children}</ul>
      )}
    </section>
  );
}

/**
 * Tampilan halaman Absensi Alumni: kegiatan SEDANG BERLANGSUNG dan AKAN
 * DATANG (paling dekat di atas). Kegiatan yang sudah selesai tidak tampil di
 * sini - statusnya ada di Riwayat Kehadiran pada Beranda.
 */
export function AlumniAbsensiView({
  membership,
  ongoing,
  upcoming,
  statusByEvent,
  error,
}: {
  /** "none" = akun belum terhubung data alumni. */
  membership: "aktif" | "nonaktif" | "none";
  ongoing: AbsensiEvent[];
  upcoming: AbsensiEvent[];
  statusByEvent: Map<string, string>;
  error: boolean;
}) {
  function ongoingBadge(event: AbsensiEvent) {
    const status = statusByEvent.get(event.id);
    if (status) {
      return (
        <span className={ATTENDANCE_STATUS_BADGE_CLASS[status] ?? BELUM_ABSEN_BADGE_CLASS}>
          {ATTENDANCE_STATUS_LABEL[status] ?? status}
        </span>
      );
    }
    if (event.attendance_closed_at) return <Badge variant="neutral">Absensi ditutup</Badge>;
    return <span className={BELUM_ABSEN_BADGE_CLASS}>{BELUM_ABSEN_LABEL}</span>;
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Absensi</h1>
          <p className="text-sm text-muted-foreground">
            Pindai QR dari panitia saat kegiatan sedang berlangsung.
          </p>
        </div>
        <Button asChild size="lg" className="w-full sm:w-auto">
          <Link href="/dashboard/absensi/scan">
            <QrCode />
            Scan QR
          </Link>
        </Button>
      </div>

      {membership === "none" ? (
        <Card className="border-warning/40 bg-warning/5">
          <CardContent className="text-sm">
            Akun Anda belum terhubung dengan data alumni, sehingga absensi belum dapat
            dilakukan. Hubungi Admin HIMASAL.
          </CardContent>
        </Card>
      ) : membership === "nonaktif" ? (
        <Card className="border-warning/40 bg-warning/5">
          <CardContent className="text-sm">
            Keanggotaan Anda sedang dinonaktifkan oleh Admin, sehingga absensi QR belum dapat
            dilakukan. Hubungi Admin HIMASAL.
          </CardContent>
        </Card>
      ) : null}

      {error ? (
        <Card>
          <CardContent className="py-8 text-center text-sm text-destructive">
            Gagal memuat kegiatan. Silakan coba lagi nanti.
          </CardContent>
        </Card>
      ) : (
        <>
          <Section
            title="Sedang Berlangsung"
            description="Kegiatan yang dapat diabsen sekarang."
            empty="Tidak ada kegiatan yang sedang berlangsung."
            count={ongoing.length}
          >
            {ongoing.map((event) => (
              <EventItem key={event.id} event={event} badge={ongoingBadge(event)} />
            ))}
          </Section>

          <Section
            title="Akan Datang"
            description="Jadwal kegiatan berikutnya, paling dekat di atas."
            empty="Belum ada kegiatan yang dijadwalkan."
            count={upcoming.length}
          >
            {upcoming.map((event) => (
              <EventItem key={event.id} event={event} />
            ))}
          </Section>
        </>
      )}

      <Card className="py-4">
        <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-medium">Kegiatan yang sudah selesai</p>
            <p className="text-sm text-muted-foreground">
              Status kehadiran kegiatan yang telah lewat ada di Riwayat Kehadiran.
            </p>
          </div>
          <Button asChild variant="outline" size="sm" className="w-fit">
            <Link href="/dashboard#riwayat">
              <History />
              Riwayat Kehadiran
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
