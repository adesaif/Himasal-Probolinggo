import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, CalendarClock, MapPin } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DonutChart } from "@/components/charts/donut-chart";
import { Panel } from "@/components/analytics/activity-panels";
import { EVENT_STATUS_LABEL, attendanceLabel, formatPercent } from "@/lib/alumni-activity";
import {
  ATTENDANCE_STATUS_BADGE_CLASS,
  ATTENDANCE_STATUS_CHART_COLOR,
  BELUM_ABSEN_BADGE_CLASS,
  BELUM_ABSEN_LABEL,
} from "@/lib/attendance";
import { formatDateTimeID, formatEventRange } from "@/lib/format-date";
import { cn } from "@/lib/utils";

type EventDetail = {
  kegiatan: {
    id: string;
    judul: string;
    lokasi: string | null;
    mulai: string;
    selesai: string | null;
    wajib: boolean;
    absensi_ditutup: string | null;
    status_kegiatan: string;
  };
  ringkasan: {
    peserta: number;
    hadir: number;
    tidak_hadir: number;
    izin: number;
    sakit: number;
    belum_absen: number;
    tingkat_kehadiran: number | null;
  };
  peserta: {
    alumni_id: string;
    nama: string | null;
    kecamatan: string | null;
    desa_kelurahan: string | null;
    angkatan: number | null;
    status: string | null;
    waktu_scan: string | null;
  }[];
};

const FILTERS = [
  { key: "", label: "Semua" },
  { key: "HADIR", label: "Hadir" },
  { key: "TIDAK_HADIR", label: "Tidak Hadir" },
  { key: "IZIN", label: "Izin" },
  { key: "SAKIT", label: "Sakit" },
  { key: "BELUM", label: BELUM_ABSEN_LABEL },
] as const;

// Detail kegiatan untuk Super Admin - READ-ONLY. Peserta = Alumni yang
// sudah terdaftar pada tanggal kegiatan (tanggal registrasi = batas bawah
// perhitungan, sama dengan status & persentase).
export default async function MonitoringKegiatanDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ status?: string }>;
}) {
  const { id } = await params;
  const { status = "" } = await searchParams;
  const supabase = await createClient();
  const { data } = await supabase.rpc("monitoring_event_detail", { p_event_id: id });
  if (!data) notFound();

  const detail = data as unknown as EventDetail;
  const { kegiatan: k, ringkasan: r } = detail;
  const held = k.status_kegiatan === "selesai";
  const filter = FILTERS.some((f) => f.key === status) ? status : "";
  const peserta = detail.peserta.filter((p) =>
    filter === "" ? true : filter === "BELUM" ? p.status === null : p.status === filter,
  );

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-4">
      <Button variant="ghost" size="sm" asChild className="w-fit">
        <Link href="/monitoring/kegiatan">
          <ArrowLeft />
          Kembali ke Kegiatan
        </Link>
      </Button>

      <div>
        <h1 className="text-2xl font-semibold tracking-tight break-words">{k.judul}</h1>
        <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <CalendarClock className="size-4" />
            {formatEventRange(k.mulai, k.selesai)}
          </span>
          {k.lokasi ? (
            <span className="flex items-center gap-1.5">
              <MapPin className="size-4" />
              {k.lokasi}
            </span>
          ) : null}
        </div>
        <div className="mt-2 flex flex-wrap gap-2">
          <Badge variant={held ? "success" : "neutral"}>
            {EVENT_STATUS_LABEL[k.status_kegiatan] ?? k.status_kegiatan}
          </Badge>
          {k.wajib ? <Badge variant="warning">Wajib Hadir</Badge> : null}
          {k.absensi_ditutup ? <Badge variant="neutral">Absensi ditutup</Badge> : null}
        </div>
      </div>

      {!held ? (
        <Panel title="Kehadiran">
          <p className="rounded-xl border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">
            Kegiatan belum terlaksana - kehadiran belum dihitung.
          </p>
        </Panel>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]">
            <Panel title="Ringkasan Kehadiran" description={`${r.peserta} Alumni diperhitungkan.`}>
              <DonutChart
                centerLabel="Peserta"
                segments={[
                  { key: "HADIR", label: "Hadir", value: r.hadir, colorHex: ATTENDANCE_STATUS_CHART_COLOR.HADIR.hex, colorClass: ATTENDANCE_STATUS_CHART_COLOR.HADIR.className, href: `?status=HADIR` },
                  { key: "TIDAK_HADIR", label: "Tidak Hadir", value: r.tidak_hadir, colorHex: ATTENDANCE_STATUS_CHART_COLOR.TIDAK_HADIR.hex, colorClass: ATTENDANCE_STATUS_CHART_COLOR.TIDAK_HADIR.className, href: `?status=TIDAK_HADIR` },
                  { key: "IZIN", label: "Izin", value: r.izin, colorHex: ATTENDANCE_STATUS_CHART_COLOR.IZIN.hex, colorClass: ATTENDANCE_STATUS_CHART_COLOR.IZIN.className, href: `?status=IZIN` },
                  { key: "SAKIT", label: "Sakit", value: r.sakit, colorHex: ATTENDANCE_STATUS_CHART_COLOR.SAKIT.hex, colorClass: ATTENDANCE_STATUS_CHART_COLOR.SAKIT.className, href: `?status=SAKIT` },
                  { key: "BELUM", label: BELUM_ABSEN_LABEL, value: r.belum_absen, colorHex: ATTENDANCE_STATUS_CHART_COLOR.BELUM_ABSEN.hex, colorClass: ATTENDANCE_STATUS_CHART_COLOR.BELUM_ABSEN.className, href: `?status=BELUM` },
                ]}
              />
              <p className="text-sm text-muted-foreground">
                Tingkat kehadiran:{" "}
                <span className="font-semibold text-foreground">{formatPercent(r.tingkat_kehadiran)}</span>
              </p>
            </Panel>

            <Panel title="Peserta" description={`${peserta.length} dari ${detail.peserta.length} Alumni`}>
              <nav aria-label="Filter status kehadiran" className="flex flex-wrap gap-1.5">
                {FILTERS.map((f) => (
                  <Link
                    key={f.key}
                    href={f.key ? `?status=${f.key}` : "?"}
                    aria-current={filter === f.key ? "page" : undefined}
                    className={cn(
                      "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                      filter === f.key
                        ? "border-primary bg-primary text-primary-foreground"
                        : "hover:bg-accent",
                    )}
                  >
                    {f.label}
                  </Link>
                ))}
              </nav>
              {peserta.length === 0 ? (
                <p className="rounded-xl border border-dashed px-4 py-6 text-center text-sm text-muted-foreground">
                  Tidak ada peserta dengan status ini.
                </p>
              ) : (
                <ul className="divide-y rounded-xl border">
                  {peserta.map((p) => (
                    <li key={p.alumni_id}>
                      <Link
                        href={`/monitoring/alumni/${p.alumni_id}`}
                        className="flex flex-col gap-1.5 px-3 py-2.5 transition-colors hover:bg-muted sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div className="min-w-0">
                          <p className="font-medium break-words">{p.nama || "(Belum diisi)"}</p>
                          <p className="text-xs text-muted-foreground">
                            {p.kecamatan ? `Kec. ${p.kecamatan}` : "Kecamatan belum dipetakan"}
                            {p.angkatan ? ` · Angkatan ${p.angkatan}` : ""}
                            {p.waktu_scan ? ` · Scan ${formatDateTimeID(p.waktu_scan)}` : ""}
                          </p>
                        </div>
                        <span
                          className={cn(
                            "w-fit shrink-0",
                            p.status ? ATTENDANCE_STATUS_BADGE_CLASS[p.status] : BELUM_ABSEN_BADGE_CLASS,
                          )}
                        >
                          {p.status ? attendanceLabel(p.status) : BELUM_ABSEN_LABEL}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
          </div>
        </>
      )}
    </div>
  );
}
