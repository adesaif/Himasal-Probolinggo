"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";

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
import { CreateAlumniDialog } from "@/components/admin/create-alumni-dialog";
import { createClient } from "@/lib/supabase/client";
import { useDebouncedValue } from "@/hooks/use-debounced-value";

type Wilayah = { id: string; nama: string };

type AlumniRow = {
  id: string;
  angkatan: number | null;
  status_keanggotaan: string;
  wilayah: { nama: string } | null;
  profiles: { full_name: string | null } | null;
};

const PAGE_SIZE = 10;
const ALL_VALUE = "__all__";

export function AlumniList({ wilayahList }: { wilayahList: Wilayah[] }) {
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 350);
  const [wilayahFilter, setWilayahFilter] = useState<string>(ALL_VALUE);
  const [statusFilter, setStatusFilter] = useState<string>(ALL_VALUE);
  const [angkatan, setAngkatan] = useState("");
  const debouncedAngkatan = useDebouncedValue(angkatan, 350);
  const [page, setPage] = useState(0);

  const [rows, setRows] = useState<AlumniRow[]>([]);
  const [count, setCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Reset ke halaman pertama setiap kali filter/pencarian berubah. Ini
  // "adjusting state during render" (bukan di dalam efek) - pola yang
  // direkomendasikan React untuk sinkronisasi state turunan dari props/state
  // lain tanpa render tambahan yang tidak perlu.
  const filterKey = `${debouncedSearch}|${wilayahFilter}|${statusFilter}|${debouncedAngkatan}`;
  const [prevFilterKey, setPrevFilterKey] = useState(filterKey);
  if (filterKey !== prevFilterKey) {
    setPrevFilterKey(filterKey);
    setPage(0);
  }

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setIsLoading(true);
      setError(null);
      const supabase = createClient();

      let query = supabase
        .from("alumni")
        .select(
          "id, angkatan, status_keanggotaan, wilayah:wilayah_id(nama), profiles:profile_id!inner(full_name)",
          { count: "exact" },
        );

      if (debouncedSearch.trim()) {
        query = query.ilike("profiles.full_name", `%${debouncedSearch.trim()}%`);
      }
      if (wilayahFilter !== ALL_VALUE) {
        query = query.eq("wilayah_id", wilayahFilter);
      }
      if (statusFilter !== ALL_VALUE) {
        query = query.eq("status_keanggotaan", statusFilter);
      }
      if (debouncedAngkatan.trim()) {
        const n = Number(debouncedAngkatan.trim());
        if (!Number.isNaN(n)) query = query.eq("angkatan", n);
      }

      const from = page * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      const { data, error, count } = await query
        .order("created_at", { ascending: false })
        .range(from, to);

      if (cancelled) return;

      if (error) {
        setError(error.message);
        setRows([]);
        setCount(0);
      } else {
        setRows((data ?? []) as unknown as AlumniRow[]);
        setCount(count ?? 0);
      }
      setIsLoading(false);
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [debouncedSearch, wilayahFilter, statusFilter, debouncedAngkatan, page]);

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(count / PAGE_SIZE)),
    [count],
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Data Alumni</h1>
        <CreateAlumniDialog wilayahList={wilayahList} />
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="relative">
          <Search className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Cari nama..."
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
            <SelectItem value="aktif">Aktif</SelectItem>
            <SelectItem value="nonaktif">Nonaktif</SelectItem>
          </SelectContent>
        </Select>
        <Input
          type="number"
          inputMode="numeric"
          placeholder="Angkatan"
          value={angkatan}
          onChange={(e) => setAngkatan(e.target.value)}
        />
      </div>

      {isLoading ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 5 }).map((_, i) => (
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
            Tidak ada data alumni yang cocok dengan pencarian/filter.
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-2">
          {rows.map((row) => (
            <Link key={row.id} href={`/admin/alumni/${row.id}`}>
              <Card className="transition-colors hover:bg-muted/50">
                <CardContent className="flex flex-col gap-1 py-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-medium">
                      {row.profiles?.full_name || "(Belum diisi)"}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {row.wilayah?.nama ?? "Wilayah belum diisi"}
                      {row.angkatan ? ` · Angkatan ${row.angkatan}` : ""}
                    </p>
                  </div>
                  <span
                    className={
                      row.status_keanggotaan === "aktif"
                        ? "w-fit rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800 dark:bg-green-900/40 dark:text-green-300"
                        : "w-fit rounded-full bg-neutral-100 px-2.5 py-0.5 text-xs font-medium text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300"
                    }
                  >
                    {row.status_keanggotaan === "aktif" ? "Aktif" : "Nonaktif"}
                  </span>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}

      {!isLoading && !error && count > 0 && (
        <div className="flex items-center justify-between text-sm">
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
