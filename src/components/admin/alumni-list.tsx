"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { CalendarCheck2, Mail, Plus, RotateCcw, Search } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { AlumniFormDialog } from "@/components/admin/alumni-form-dialog";
import { AlumniSearchableSelect } from "@/components/admin/alumni-searchable-select";
import { DeleteAlumniButton } from "@/components/admin/delete-alumni-button";
import { createClient } from "@/lib/supabase/client";
import { desaKelurahanLabel, type Kecamatan } from "@/lib/alumni-lokasi";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { ACCOUNT_STATUS_LABEL, ROLE_BADGE, toAccountStatus } from "@/lib/alumni-account-status";
import {
  ACTIVITY_STATUSES,
  ACTIVITY_STATUS_BADGE,
  ACTIVITY_STATUS_LABEL,
  activityStatusLabel,
  formatPercent,
  toActivityStatus,
} from "@/lib/alumni-activity";
import { ROLE_LABEL } from "@/lib/constants";
import { formatDateID } from "@/lib/format-date";
import type { Database } from "@/types/database.types";

type AlumniRow = Database["public"]["Functions"]["monitoring_alumni_list"]["Returns"][number];

const PAGE_SIZE = 20;
const ALL_VALUE = "__all__";
/** Pilihan Kecamatan khusus: Alumni yang belum dipetakan ke kecamatan. */
export const UNMAPPED_KECAMATAN = "__belum_dipetakan__";

export type AlumniListFilters = {
  q?: string;
  kecamatan?: string;
  desa?: string;
  status?: string;
  angkatan?: string;
  akun?: string;
  tahun?: string;
};

function formatAlamat(row: AlumniRow): string | null {
  if (!row.kecamatan_nama) return null;
  const kec = `Kec. ${row.kecamatan_nama}`;
  return row.desa_kelurahan_nama
    ? `${desaKelurahanLabel(row.desa_kelurahan_jenis)} ${row.desa_kelurahan_nama}, ${kec}`
    : kec;
}

function FilterField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      {children}
    </div>
  );
}

/**
 * Daftar Alumni - SATU komponen untuk Admin -> Alumni (mode "admin": tambah
 * & hapus) dan Super Admin -> Monitoring Alumni (mode "monitoring":
 * read-only). Semua filter (nama, kecamatan, desa/kelurahan, status
 * keaktifan, angkatan, status akun, tahun) digabung AND dan dieksekusi di
 * database lewat RPC monitoring_alumni_list. Filter awal bisa datang dari
 * URL (drill-down dari dashboard) dan URL ikut diperbarui saat filter
 * diubah, sehingga tautan bisa dibagikan.
 */
export function AlumniList({
  lokasi,
  mode = "admin",
  years,
  initialFilters = {},
}: {
  lokasi: Kecamatan[];
  mode?: "admin" | "monitoring";
  years: number[];
  initialFilters?: AlumniListFilters;
}) {
  const readOnly = mode === "monitoring";
  const detailBase = readOnly ? "/monitoring/alumni" : "/admin/alumni";
  const currentYear = years[0] ?? new Date().getFullYear();

  const [search, setSearch] = useState(initialFilters.q ?? "");
  const debouncedSearch = useDebouncedValue(search, 350);
  const [kecamatanId, setKecamatanId] = useState<string | null>(initialFilters.kecamatan ?? null);
  const [desaId, setDesaId] = useState<string | null>(initialFilters.desa ?? null);
  const [status, setStatus] = useState<string>(
    ACTIVITY_STATUSES.includes(initialFilters.status as never) ? initialFilters.status! : ALL_VALUE,
  );
  const [angkatan, setAngkatan] = useState<string>(initialFilters.angkatan ?? ALL_VALUE);
  const [akun, setAkun] = useState<string>(
    initialFilters.akun === "ada" || initialFilters.akun === "belum" ? initialFilters.akun : ALL_VALUE,
  );
  const [tahun, setTahun] = useState<string>(
    years.includes(Number(initialFilters.tahun)) ? initialFilters.tahun! : String(currentYear),
  );
  const [page, setPage] = useState(0);
  const [reloadKey, setReloadKey] = useState(0);

  const [rows, setRows] = useState<AlumniRow[]>([]);
  const [count, setCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [angkatanOptions, setAngkatanOptions] = useState<number[]>([]);

  // Reset ke halaman pertama setiap kali filter/pencarian berubah
  // ("adjusting state during render", pola yang dipakai sejak versi lama).
  const filterKey = `${debouncedSearch}|${kecamatanId}|${desaId}|${status}|${angkatan}|${akun}|${tahun}`;
  const [prevFilterKey, setPrevFilterKey] = useState(filterKey);
  if (filterKey !== prevFilterKey) {
    setPrevFilterKey(filterKey);
    setPage(0);
  }

  // URL mengikuti filter (tanpa memicu navigasi/refresh server).
  useEffect(() => {
    const params = new URLSearchParams();
    if (debouncedSearch.trim()) params.set("q", debouncedSearch.trim());
    if (kecamatanId) params.set("kecamatan", kecamatanId);
    if (desaId) params.set("desa", desaId);
    if (status !== ALL_VALUE) params.set("status", status);
    if (angkatan !== ALL_VALUE) params.set("angkatan", angkatan);
    if (akun !== ALL_VALUE) params.set("akun", akun);
    if (tahun !== String(currentYear)) params.set("tahun", tahun);
    const qs = params.toString();
    window.history.replaceState(null, "", `${window.location.pathname}${qs ? `?${qs}` : ""}`);
  }, [debouncedSearch, kecamatanId, desaId, status, angkatan, akun, tahun, currentYear]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setIsLoading(true);
      setError(null);
      const supabase = createClient();
      const unmapped = kecamatanId === UNMAPPED_KECAMATAN;

      const { data, error } = await supabase.rpc("monitoring_alumni_list", {
        p_search: debouncedSearch.trim() || undefined,
        p_kecamatan_id: kecamatanId && !unmapped ? kecamatanId : undefined,
        p_belum_dipetakan: unmapped,
        p_desa_kelurahan_id: desaId ?? undefined,
        p_status: status === ALL_VALUE ? undefined : status,
        p_angkatan: angkatan === ALL_VALUE ? undefined : Number(angkatan),
        p_akun: akun === ALL_VALUE ? undefined : akun,
        p_year: Number(tahun),
        p_limit: PAGE_SIZE,
        p_offset: page * PAGE_SIZE,
      });

      if (cancelled) return;

      if (error) {
        setError(error.message);
        setRows([]);
        setCount(0);
      } else if ((data ?? []).length === 0 && page > 0) {
        // Halaman terakhir kosong (mis. setelah menghapus satu-satunya
        // alumni di halaman itu) - mundur satu halaman.
        setPage((p) => Math.max(0, p - 1));
        return;
      } else {
        setRows(data ?? []);
        setCount(data?.[0]?.total_count ?? 0);
      }
      setIsLoading(false);
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [debouncedSearch, kecamatanId, desaId, status, angkatan, akun, tahun, page, reloadKey]);

  useEffect(() => {
    let cancelled = false;
    createClient()
      .rpc("admin_alumni_angkatan_options")
      .then(({ data }) => {
        if (!cancelled) setAngkatanOptions((data ?? []).map((r) => r.angkatan));
      });
    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  const kecamatanOptions = useMemo(
    () => [
      ...lokasi.map((k) => ({ value: k.id, label: k.nama })),
      { value: UNMAPPED_KECAMATAN, label: "Belum Dipetakan" },
    ],
    [lokasi],
  );
  const desaOptions = useMemo(() => {
    const kec = lokasi.find((k) => k.id === kecamatanId);
    return (kec?.desaKelurahan ?? []).map((d) => ({
      value: d.id,
      label: d.nama,
      group: d.jenis === "kelurahan" ? "Kelurahan" : "Desa",
    }));
  }, [lokasi, kecamatanId]);

  // Angkatan yang sedang dipilih tetap muncul di daftar walau (setelah
  // hapus/edit) sudah tidak ada alumninya.
  const angkatanChoices = useMemo(() => {
    const set = new Set(angkatanOptions);
    if (angkatan !== ALL_VALUE) set.add(Number(angkatan));
    return [...set].sort((a, b) => b - a);
  }, [angkatanOptions, angkatan]);

  const hasSearch = debouncedSearch.trim() !== "";
  const hasFilter =
    kecamatanId !== null ||
    desaId !== null ||
    status !== ALL_VALUE ||
    angkatan !== ALL_VALUE ||
    akun !== ALL_VALUE ||
    tahun !== String(currentYear);
  const canReset = hasFilter || search !== "";

  function resetFilters() {
    setSearch("");
    setKecamatanId(null);
    setDesaId(null);
    setStatus(ALL_VALUE);
    setAngkatan(ALL_VALUE);
    setAkun(ALL_VALUE);
    setTahun(String(currentYear));
  }

  const reload = () => setReloadKey((k) => k + 1);
  const totalPages = Math.max(1, Math.ceil(count / PAGE_SIZE));
  const tahunLabel = Number(tahun) < currentYear ? `rekap ${tahun}` : `tahun ${tahun}`;

  return (
    <div className="flex flex-col gap-4">
      <AdminPageHeader
        title={readOnly ? "Monitoring Alumni" : "Data Alumni"}
        description={
          !isLoading && !error
            ? `${count} alumni${hasSearch || hasFilter ? " sesuai pencarian/filter" : ""} · status ${tahunLabel}`
            : undefined
        }
        actions={
          readOnly ? undefined : (
            <AlumniFormDialog
              lokasi={lokasi}
              onSaved={reload}
              trigger={
                <Button>
                  <Plus />
                  Tambah Alumni
                </Button>
              }
            />
          )
        }
      />

      <div className="relative">
        <Search className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="search"
          placeholder="Cari nama alumni..."
          aria-label="Cari nama alumni"
          className="pl-8"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <FilterField label="Kecamatan">
          <AlumniSearchableSelect
            value={kecamatanId}
            onChange={(next) => {
              setKecamatanId(next);
              // Desa/Kelurahan selalu milik kecamatan yang dipilih.
              setDesaId(null);
            }}
            options={kecamatanOptions}
            allOptionLabel="Semua Kecamatan"
            placeholder="Semua Kecamatan"
            searchPlaceholder="Cari kecamatan..."
            emptyText="Kecamatan tidak ditemukan."
          />
        </FilterField>
        <FilterField label="Desa/Kelurahan">
          <AlumniSearchableSelect
            value={desaId}
            onChange={setDesaId}
            options={desaOptions}
            allOptionLabel="Semua Desa/Kelurahan"
            placeholder={
              kecamatanId && kecamatanId !== UNMAPPED_KECAMATAN
                ? "Semua Desa/Kelurahan"
                : "Pilih kecamatan dulu"
            }
            searchPlaceholder="Cari desa/kelurahan..."
            emptyText="Desa/kelurahan tidak ditemukan."
            disabled={!kecamatanId || kecamatanId === UNMAPPED_KECAMATAN}
          />
        </FilterField>
        <FilterField label="Status Keaktifan">
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="w-full" aria-label="Filter status keaktifan">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_VALUE}>Semua Status</SelectItem>
              {ACTIVITY_STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {ACTIVITY_STATUS_LABEL[s]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FilterField>
        <FilterField label="Tahun">
          <Select value={tahun} onValueChange={setTahun}>
            <SelectTrigger className="w-full" aria-label="Filter tahun">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {years.map((y) => (
                <SelectItem key={y} value={String(y)}>
                  {y}
                  {y === currentYear ? " (berjalan)" : " (final)"}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FilterField>
        <FilterField label="Angkatan">
          <Select value={angkatan} onValueChange={setAngkatan}>
            <SelectTrigger className="w-full" aria-label="Filter angkatan">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="max-h-72">
              <SelectItem value={ALL_VALUE}>Semua Angkatan</SelectItem>
              {angkatanChoices.map((year) => (
                <SelectItem key={year} value={String(year)}>
                  {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FilterField>
        <FilterField label="Status Akun">
          <Select value={akun} onValueChange={setAkun}>
            <SelectTrigger className="w-full" aria-label="Filter status akun">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_VALUE}>Semua</SelectItem>
              <SelectItem value="ada">Sudah punya akun</SelectItem>
              <SelectItem value="belum">Belum punya akun</SelectItem>
            </SelectContent>
          </Select>
        </FilterField>
        <div className="flex items-end sm:col-span-2">
          <Button
            variant="outline"
            onClick={resetFilters}
            disabled={!canReset}
            className="w-full sm:w-auto"
          >
            <RotateCcw />
            Reset Filter
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-[88px] w-full" />
          ))}
        </div>
      ) : error ? (
        <Card>
          <CardContent className="py-8 text-center text-sm text-destructive">
            Gagal memuat data: {error}
          </CardContent>
        </Card>
      ) : rows.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-8 text-center text-sm text-muted-foreground">
            <p>
              {hasFilter
                ? "Tidak ada alumni yang sesuai dengan filter."
                : hasSearch
                  ? "Tidak ditemukan alumni dengan nama tersebut."
                  : "Belum ada data alumni."}
            </p>
            {canReset ? (
              <Button variant="outline" size="sm" onClick={resetFilters}>
                <RotateCcw />
                Reset Filter
              </Button>
            ) : null}
          </CardContent>
        </Card>
      ) : (
        <ul className="flex flex-col gap-2">
          {rows.map((row) => {
            const alamat = formatAlamat(row);
            const activity = toActivityStatus(row.status);
            const role = row.role ?? "alumni";
            return (
              <li key={row.id}>
                <Card className="relative gap-0 py-0 transition-colors hover:bg-muted/50">
                  <CardContent className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <Link
                        href={`${detailBase}/${row.id}${Number(tahun) !== currentYear ? `?tahun=${tahun}` : ""}`}
                        className="font-medium break-words outline-none after:absolute after:inset-0 after:rounded-xl focus-visible:underline"
                      >
                        {row.nama || "(Belum diisi)"}
                      </Link>
                      <p className="text-sm text-muted-foreground">
                        {alamat ?? <span className="italic">Alamat belum dipetakan</span>}
                        {row.angkatan ? ` · Angkatan ${row.angkatan}` : ""}
                      </p>
                      <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Mail className="size-3 shrink-0" />
                          {ACCOUNT_STATUS_LABEL[toAccountStatus(row.account_status)]}
                        </span>
                        <span className="flex items-center gap-1">
                          <CalendarCheck2 className="size-3 shrink-0" />
                          Terakhir hadir:{" "}
                          {row.terakhir_hadir ? formatDateID(row.terakhir_hadir) : "belum pernah"}
                        </span>
                      </p>
                    </div>
                    <div className="relative z-10 flex shrink-0 flex-wrap items-center gap-2 sm:justify-end">
                      <Badge variant={ROLE_BADGE[role]}>{ROLE_LABEL[role]}</Badge>
                      <Badge variant={ACTIVITY_STATUS_BADGE[activity]}>
                        {activityStatusLabel(activity, row.is_final)}
                      </Badge>
                      {activity !== "belum_ada_data" ? (
                        <span className="text-xs text-muted-foreground tabular-nums">
                          {formatPercent(row.persentase)} · {row.hadir}/{row.kegiatan}
                        </span>
                      ) : null}
                      {readOnly ? null : (
                        <DeleteAlumniButton
                          target={{
                            id: row.id,
                            nama: row.nama,
                            alamat,
                            angkatan: row.angkatan,
                            jumlahAbsensi: row.jumlah_absensi,
                            hasAccount: row.has_account,
                            staffRole: role !== "alumni" ? role : null,
                          }}
                          onDeleted={reload}
                        />
                      )}
                    </div>
                  </CardContent>
                </Card>
              </li>
            );
          })}
        </ul>
      )}

      {!isLoading && !error && count > 0 && (
        <div className="flex flex-col gap-2 text-sm sm:flex-row sm:items-center sm:justify-between">
          <p className="text-muted-foreground">
            Halaman {page + 1} dari {totalPages} ({count} alumni)
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page === 0}
              onClick={() => setPage((p) => Math.max(0, p - 1))}
            >
              Sebelumnya
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page + 1 >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Berikutnya
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
