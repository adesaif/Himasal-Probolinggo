"use client";

import { useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";
import { toast } from "sonner";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { StatCard } from "@/components/shared/stat-card";
import { createClient } from "@/lib/supabase/client";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { formatDateTimeID } from "@/lib/format-date";
import { ATTENDANCE_STATUS_LABEL } from "@/lib/attendance";

type Wilayah = { id: string; nama: string };

type AlumniRow = {
  id: string;
  angkatan: number | null;
  wilayah: { nama: string } | null;
  profile: { full_name: string | null } | null;
};

type AttendanceEntry = { id: string; status: string; scanned_at: string | null };

type Summary = {
  total: number;
  HADIR: number;
  TIDAK_HADIR: number;
  IZIN: number;
  SAKIT: number;
};

const PAGE_SIZE = 15;
const ALL_VALUE = "__all__";
const BELUM_ABSEN_VALUE = "__belum__";
const EMPTY_MATCH_ID = "00000000-0000-0000-0000-000000000000";

export function AttendanceParticipantList({ eventId }: { eventId: string }) {
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 350);
  const [wilayahFilter, setWilayahFilter] = useState(ALL_VALUE);
  const [statusFilter, setStatusFilter] = useState(ALL_VALUE);
  const [page, setPage] = useState(0);

  const [wilayahList, setWilayahList] = useState<Wilayah[]>([]);
  const [rows, setRows] = useState<AlumniRow[]>([]);
  const [count, setCount] = useState(0);
  const [attendanceMap, setAttendanceMap] = useState<Record<string, AttendanceEntry>>({});
  const [summary, setSummary] = useState<Summary>({
    total: 0,
    HADIR: 0,
    TIDAK_HADIR: 0,
    IZIN: 0,
    SAKIT: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyAlumniId, setBusyAlumniId] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  // Reset ke halaman pertama setiap kali filter/pencarian berubah (pola
  // "adjust state during render" - sama seperti admin/alumni).
  const filterKey = `${debouncedSearch}|${wilayahFilter}|${statusFilter}`;
  const [prevFilterKey, setPrevFilterKey] = useState(filterKey);
  if (filterKey !== prevFilterKey) {
    setPrevFilterKey(filterKey);
    setPage(0);
  }

  useEffect(() => {
    let cancelled = false;
    async function loadWilayah() {
      const supabase = createClient();
      const { data } = await supabase.from("wilayah").select("id, nama").order("nama");
      if (!cancelled) setWilayahList(data ?? []);
    }
    loadWilayah();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setIsLoading(true);
      setError(null);
      const supabase = createClient();

      // Ambil seluruh attendance_records event ini dulu - dipakai untuk
      // status per baris, ringkasan jumlah, DAN filter status (termasuk
      // "Belum Absen" yang berarti TIDAK ADA baris sama sekali, sehingga
      // tidak bisa difilter langsung lewat query tabel alumni).
      const { data: attendanceRows, error: attendanceError } = await supabase
        .from("attendance_records")
        .select("id, alumni_id, status, scanned_at")
        .eq("event_id", eventId);

      if (cancelled) return;

      if (attendanceError) {
        setError(attendanceError.message);
        setIsLoading(false);
        return;
      }

      const map: Record<string, AttendanceEntry> = {};
      const nextSummary: Summary = { total: 0, HADIR: 0, TIDAK_HADIR: 0, IZIN: 0, SAKIT: 0 };
      for (const record of attendanceRows ?? []) {
        map[record.alumni_id] = {
          id: record.id,
          status: record.status,
          scanned_at: record.scanned_at,
        };
        if (record.status in nextSummary) {
          nextSummary[record.status as "HADIR" | "TIDAK_HADIR" | "IZIN" | "SAKIT"] += 1;
        }
      }

      const { count: totalActive } = await supabase
        .from("alumni")
        .select("id", { count: "exact", head: true })
        .eq("status_keanggotaan", "aktif");

      let query = supabase
        .from("alumni")
        .select(
          "id, angkatan, wilayah:wilayah_id(nama), profile:profile_id!inner(full_name)",
          { count: "exact" },
        )
        .eq("status_keanggotaan", "aktif");

      if (debouncedSearch.trim()) {
        query = query.ilike("profile.full_name", `%${debouncedSearch.trim()}%`);
      }
      if (wilayahFilter !== ALL_VALUE) {
        query = query.eq("wilayah_id", wilayahFilter);
      }
      if (statusFilter === BELUM_ABSEN_VALUE) {
        const recordedIds = Object.keys(map);
        if (recordedIds.length > 0) {
          query = query.not("id", "in", `(${recordedIds.join(",")})`);
        }
      } else if (statusFilter !== ALL_VALUE) {
        const matchingIds = Object.entries(map)
          .filter(([, v]) => v.status === statusFilter)
          .map(([alumniId]) => alumniId);
        query = query.in("id", matchingIds.length > 0 ? matchingIds : [EMPTY_MATCH_ID]);
      }

      const from = page * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      const {
        data,
        error: alumniError,
        count: filteredCount,
      } = await query.order("angkatan", { ascending: false }).range(from, to);

      if (cancelled) return;

      if (alumniError) {
        setError(alumniError.message);
        setIsLoading(false);
        return;
      }

      nextSummary.total = totalActive ?? 0;
      setSummary(nextSummary);
      setAttendanceMap(map);
      setRows((data ?? []) as unknown as AlumniRow[]);
      setCount(filteredCount ?? 0);
      setIsLoading(false);
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [eventId, debouncedSearch, wilayahFilter, statusFilter, page, reloadKey]);

  const totalPages = useMemo(() => Math.max(1, Math.ceil(count / PAGE_SIZE)), [count]);
  const belumAbsen = Math.max(
    0,
    summary.total - (summary.HADIR + summary.TIDAK_HADIR + summary.IZIN + summary.SAKIT),
  );

  async function correctStatus(alumniId: string, status: string) {
    setBusyAlumniId(alumniId);
    const supabase = createClient();
    const { error } = await supabase
      .from("attendance_records")
      .upsert({ event_id: eventId, alumni_id: alumniId, status }, { onConflict: "event_id,alumni_id" });
    setBusyAlumniId(null);

    if (error) {
      toast.error("Gagal menyimpan koreksi", { description: error.message });
      return;
    }
    toast.success("Status kehadiran diperbarui");
    setReloadKey((k) => k + 1);
  }

  async function handleExportCsv() {
    const supabase = createClient();
    const { data: allAlumni, error: exportError } = await supabase
      .from("alumni")
      .select("id, angkatan, wilayah:wilayah_id(nama), profile:profile_id!inner(full_name)")
      .eq("status_keanggotaan", "aktif")
      .order("angkatan", { ascending: false })
      .limit(5000);

    if (exportError) {
      toast.error("Gagal mengekspor data", { description: exportError.message });
      return;
    }

    const header = ["Nama", "Angkatan", "Wilayah", "Status", "Waktu Hadir"];
    const lines = ((allAlumni ?? []) as unknown as AlumniRow[]).map((row) => {
      const record = attendanceMap[row.id];
      const status = record
        ? (ATTENDANCE_STATUS_LABEL[record.status] ?? record.status)
        : "Belum Absen";
      const waktu = record?.scanned_at ? formatDateTimeID(record.scanned_at) : "";
      const cells = [
        row.profile?.full_name ?? "",
        row.angkatan?.toString() ?? "",
        row.wilayah?.nama ?? "",
        status,
        waktu,
      ];
      return cells.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",");
    });

    const csv = [header.join(","), ...lines].join("\n");
    const blob = new Blob([`﻿${csv}`], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `absensi-${eventId}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <StatCard label="Total Aktif" value={summary.total} />
        <StatCard label="Hadir" value={summary.HADIR} />
        <StatCard label="Tidak Hadir" value={summary.TIDAK_HADIR} />
        <StatCard label="Izin" value={summary.IZIN} />
        <StatCard label="Sakit" value={summary.SAKIT} />
      </div>
      <p className="text-sm text-muted-foreground">
        Belum absen: <span className="font-medium text-foreground">{belumAbsen}</span>
      </p>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="grid flex-1 grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="relative">
            <Search className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Cari nama alumni..."
              className="pl-8"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Select value={wilayahFilter} onValueChange={setWilayahFilter}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Semua wilayah" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_VALUE}>Semua wilayah</SelectItem>
              {wilayahList.map((w) => (
                <SelectItem key={w.id} value={w.id}>
                  {w.nama}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Semua status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_VALUE}>Semua status</SelectItem>
              <SelectItem value="HADIR">Hadir</SelectItem>
              <SelectItem value="TIDAK_HADIR">Tidak Hadir</SelectItem>
              <SelectItem value="IZIN">Izin</SelectItem>
              <SelectItem value="SAKIT">Sakit</SelectItem>
              <SelectItem value={BELUM_ABSEN_VALUE}>Belum Absen</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button variant="outline" onClick={handleExportCsv}>
          Export CSV
        </Button>
      </div>

      {isLoading ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
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
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            Tidak ada alumni yang cocok dengan pencarian/filter.
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-2">
          {rows.map((row) => {
            const record = attendanceMap[row.id];
            return (
              <Card key={row.id}>
                <CardContent className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="truncate font-medium">
                      {row.profile?.full_name || "(Belum diisi)"}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {row.wilayah?.nama ?? "Wilayah belum diisi"}
                      {row.angkatan ? ` · Angkatan ${row.angkatan}` : ""}
                      {record?.scanned_at ? ` · Absen: ${formatDateTimeID(record.scanned_at)}` : ""}
                    </p>
                  </div>
                  <Select
                    value={record?.status}
                    onValueChange={(value) => correctStatus(row.id, value)}
                    disabled={busyAlumniId === row.id}
                  >
                    <SelectTrigger className="w-full sm:w-40">
                      <SelectValue placeholder="Belum Absen" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="HADIR">Hadir</SelectItem>
                      <SelectItem value="TIDAK_HADIR">Tidak Hadir</SelectItem>
                      <SelectItem value="IZIN">Izin</SelectItem>
                      <SelectItem value="SAKIT">Sakit</SelectItem>
                    </SelectContent>
                  </Select>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {!isLoading && !error && count > 0 ? (
        <div className="flex items-center justify-between text-sm">
          <p className="text-muted-foreground">
            Halaman {page + 1} dari {totalPages}
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
      ) : null}
    </div>
  );
}
