import Link from "next/link";
import { CalendarCheck2, CalendarClock, MapPin, UserRound } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { LineChart } from "@/components/charts/line-chart";
import {
  ACTIVITY_STATUS_BADGE,
  ACTIVITY_STATUS_COLOR,
  ACTIVITY_STATUS_HINT,
  MONTH_SHORT,
  activityStatusLabel,
  attendanceLabel,
  formatPercent,
  type AlumniActivityDetail,
} from "@/lib/alumni-activity";
import { ATTENDANCE_STATUS_BADGE_CLASS, BELUM_ABSEN_BADGE_CLASS } from "@/lib/attendance";
import { ACCOUNT_STATUS_LABEL, ROLE_BADGE, toAccountStatus } from "@/lib/alumni-account-status";
import { desaKelurahanLabel } from "@/lib/alumni-lokasi";
import { ROLE_LABEL } from "@/lib/constants";
import { formatDateID } from "@/lib/format-date";
import { cn } from "@/lib/utils";

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 font-medium break-words">{value || "-"}</dd>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone?: string }) {
  return (
    <div className="rounded-xl border bg-card px-3 py-2.5">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={cn("text-xl font-semibold tabular-nums", tone)}>{value}</p>
    </div>
  );
}

/**
 * MASTER VIEW satu Alumni: profil + ringkasan kehadiran + tren + riwayat.
 * Dipakai APA ADANYA oleh Dashboard Alumni, Admin -> Detail Alumni, dan
 * Super Admin -> Monitoring Alumni. Data dari satu RPC
 * (alumni_activity_detail) - komponen ini tidak menghitung status.
 */
export function AlumniMasterDetail({
  detail,
  yearHref,
  eventHref,
  actions,
  children,
}: {
  detail: AlumniActivityDetail;
  yearHref: (year: number) => string;
  eventHref?: (eventId: string) => string;
  actions?: React.ReactNode;
  /** Kartu tambahan (mis. Akun & Role di Admin) - tampil setelah Profil. */
  children?: React.ReactNode;
}) {
  const { profil, ringkasan: r, tren, riwayat } = detail;
  const role = profil.role;
  const lokasi = profil.kecamatan
    ? [
        profil.desa_kelurahan
          ? `${desaKelurahanLabel(profil.desa_kelurahan_jenis)} ${profil.desa_kelurahan}`
          : null,
        `Kec. ${profil.kecamatan}`,
      ]
        .filter(Boolean)
        .join(", ")
    : null;
  const lahir = [
    profil.tempat_lahir,
    profil.tanggal_lahir ? formatDateID(profil.tanggal_lahir) : null,
  ]
    .filter(Boolean)
    .join(", ");
  const noData = r.status === "belum_ada_data";
  const hasTrend = tren.some((t) => t.kegiatan > 0);

  const years = [...new Set(riwayat.map((h) => h.tahun))].sort((a, b) => b - a);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <UserRound className="size-6" />
          </span>
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold tracking-tight break-words">
              {profil.nama || "(Belum diisi)"}
            </h1>
            <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
              <Badge variant={ACTIVITY_STATUS_BADGE[r.status]}>
                {activityStatusLabel(r.status, r.is_final)}
              </Badge>
              {role && role !== "alumni" ? (
                <Badge variant={ROLE_BADGE[role]}>{ROLE_LABEL[role]}</Badge>
              ) : null}
              {profil.angkatan ? (
                <span className="text-sm text-muted-foreground">Angkatan {profil.angkatan}</span>
              ) : null}
            </div>
          </div>
        </div>
        {actions ? <div className="flex shrink-0 flex-wrap gap-2">{actions}</div> : null}
      </div>

      {/* PROFIL */}
      <Card>
        <CardContent className="flex flex-col gap-4">
          <h2 className="font-semibold tracking-tight">Profil</h2>
          <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Nama Lengkap" value={profil.nama} />
            <Field label="Kecamatan" value={profil.kecamatan} />
            <Field
              label="Desa/Kelurahan"
              value={
                profil.desa_kelurahan
                  ? `${desaKelurahanLabel(profil.desa_kelurahan_jenis)} ${profil.desa_kelurahan}`
                  : null
              }
            />
            <Field
              label="Alamat"
              value={
                lokasi || profil.alamat ? (
                  <span className="flex items-start gap-1.5">
                    <MapPin className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                    <span>
                      {lokasi}
                      {profil.alamat ? (
                        <span className="block text-sm font-normal text-muted-foreground">
                          {profil.alamat}
                        </span>
                      ) : null}
                    </span>
                  </span>
                ) : null
              }
            />
            {detail.data_sensitif_disembunyikan ? null : (
              <Field label="Nomor HP" value={profil.no_hp} />
            )}
            <Field
              label={detail.data_sensitif_disembunyikan ? "Tempat Lahir" : "Tempat/Tanggal Lahir"}
              value={detail.data_sensitif_disembunyikan ? profil.tempat_lahir : lahir}
            />
            <Field label="Angkatan" value={profil.angkatan?.toString()} />
            <Field
              label="Status Akun"
              value={ACCOUNT_STATUS_LABEL[toAccountStatus(profil.status_akun)]}
            />
            {role && role !== "alumni" ? <Field label="Role" value={ROLE_LABEL[role]} /> : null}
            <Field label="Terdaftar" value={formatDateID(profil.terdaftar)} />
          </dl>
          {detail.data_sensitif_disembunyikan ? (
            <p className="text-xs text-muted-foreground">
              Nomor HP dan tanggal lahir tidak ditampilkan di Monitoring.
            </p>
          ) : null}
        </CardContent>
      </Card>

      {children}

      {/* RINGKASAN KEHADIRAN */}
      <Card>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="font-semibold tracking-tight">
              Ringkasan Kehadiran {r.tahun}
              {r.is_final ? (
                <span className="ml-1.5 text-sm font-normal text-muted-foreground">(rekap final)</span>
              ) : r.tahun === detail.tahun_berjalan ? (
                <span className="ml-1.5 text-sm font-normal text-muted-foreground">(berjalan)</span>
              ) : null}
            </h2>
            {detail.tahun_tersedia.length > 1 ? (
              <nav aria-label="Pilih tahun" className="flex flex-wrap gap-1.5">
                {detail.tahun_tersedia.map((year) => (
                  <Link
                    key={year}
                    href={yearHref(year)}
                    aria-current={year === r.tahun ? "page" : undefined}
                    className={cn(
                      "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                      year === r.tahun
                        ? "border-primary bg-primary text-primary-foreground"
                        : "hover:bg-accent",
                    )}
                  >
                    {year}
                  </Link>
                ))}
              </nav>
            ) : null}
          </div>

          {noData ? (
            <div className="rounded-xl border border-dashed px-4 py-6 text-center">
              <p className="font-medium">Belum ada data aktivitas</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Belum ada kegiatan terlaksana yang diperhitungkan pada tahun {r.tahun}.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,15rem)_minmax(0,1fr)]">
              <div className="flex flex-col gap-2 rounded-xl bg-muted/50 p-4">
                <p className="text-xs text-muted-foreground">Persentase kehadiran</p>
                <p className="text-4xl font-semibold tracking-tight tabular-nums">
                  {formatPercent(r.persentase)}
                </p>
                <div
                  className="h-2 overflow-hidden rounded-full bg-muted"
                  role="progressbar"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={r.persentase ?? 0}
                  aria-label="Persentase kehadiran"
                >
                  <div
                    className={cn("h-full rounded-full", ACTIVITY_STATUS_COLOR[r.status].className)}
                    style={{ width: `${Math.min(100, r.persentase ?? 0)}%` }}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  {r.hadir} hadir dari {r.kegiatan} kegiatan · batas aktif 50%
                </p>
                <Badge variant={ACTIVITY_STATUS_BADGE[r.status]} className="w-fit">
                  {activityStatusLabel(r.status, r.is_final)}
                </Badge>
                <p className="text-xs text-muted-foreground">{ACTIVITY_STATUS_HINT[r.status]}</p>
              </div>
              <div className="flex flex-col gap-3">
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  <Stat label="Kegiatan terlaksana" value={r.kegiatan} />
                  <Stat label="Hadir" value={r.hadir} tone="text-green-600 dark:text-green-400" />
                  <Stat label="Tidak Hadir" value={r.tidak_hadir} tone="text-red-600 dark:text-red-400" />
                  <Stat label="Izin" value={r.izin} tone="text-blue-600 dark:text-blue-400" />
                  <Stat label="Sakit" value={r.sakit} tone="text-purple-600 dark:text-purple-400" />
                  <Stat label="Tidak Tercatat" value={r.tidak_tercatat} />
                </div>
                <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <CalendarCheck2 className="size-4 shrink-0" />
                  Terakhir hadir:{" "}
                  <span className="font-medium text-foreground">
                    {r.terakhir_hadir ? formatDateID(r.terakhir_hadir) : "Belum pernah"}
                  </span>
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* TREN */}
      <Card>
        <CardContent className="flex flex-col gap-3">
          <h2 className="font-semibold tracking-tight">Tren Kehadiran {r.tahun}</h2>
          {hasTrend ? (
            <LineChart
              ariaLabel={`Tren kehadiran ${profil.nama ?? "Alumni"} tahun ${r.tahun}`}
              data={tren.map((t) => ({
                label: MONTH_SHORT[t.bulan - 1],
                values: t.akan_datang
                  ? { kegiatan: null, hadir: null }
                  : { kegiatan: t.kegiatan, hadir: t.hadir },
              }))}
              series={[
                { key: "kegiatan", label: "Kegiatan terlaksana", color: "#1e3a8a" },
                { key: "hadir", label: "Hadir", color: "#16a34a" },
              ]}
            />
          ) : (
            <p className="py-4 text-center text-sm text-muted-foreground">
              Belum ada data aktivitas pada tahun {r.tahun}.
            </p>
          )}
        </CardContent>
      </Card>

      {/* RIWAYAT */}
      <Card>
        <CardContent className="flex flex-col gap-3">
          <div>
            <h2 className="font-semibold tracking-tight">Riwayat Kehadiran</h2>
            <p className="text-sm text-muted-foreground">
              Kegiatan terlaksana sejak tanggal terdaftar, terbaru di atas. Catatan sebelum
              tanggal terdaftar tetap tampil sebagai histori, tetapi tidak dihitung.
            </p>
          </div>
          {riwayat.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">
              Belum ada riwayat kegiatan.
            </p>
          ) : (
            <div className="flex flex-col gap-4">
              {years.map((year) => (
                <section key={year} className="flex flex-col gap-1.5">
                  <h3 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                    {year}
                  </h3>
                  <ul className="divide-y rounded-xl border">
                    {riwayat
                      .filter((h) => h.tahun === year)
                      .map((h) => {
                        const title = eventHref ? (
                          <Link href={eventHref(h.event_id)} className="font-medium hover:underline">
                            {h.judul}
                          </Link>
                        ) : (
                          <span className="font-medium">{h.judul}</span>
                        );
                        return (
                          <li
                            key={h.event_id}
                            className={cn(
                              "flex flex-col gap-1.5 px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between",
                              !h.dihitung && "bg-muted/40",
                            )}
                          >
                            <div className="min-w-0">
                              <p className="break-words">{title}</p>
                              <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                <CalendarClock className="size-3.5 shrink-0" />
                                {formatDateID(h.mulai)}
                                {h.wajib ? " · Wajib hadir" : ""}
                                {h.dihitung ? "" : " · Sebelum terdaftar, tidak dihitung"}
                              </p>
                            </div>
                            <span
                              className={cn(
                                "w-fit shrink-0",
                                h.status
                                  ? ATTENDANCE_STATUS_BADGE_CLASS[h.status]
                                  : BELUM_ABSEN_BADGE_CLASS,
                              )}
                            >
                              {attendanceLabel(h.status)}
                            </span>
                          </li>
                        );
                      })}
                  </ul>
                </section>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
