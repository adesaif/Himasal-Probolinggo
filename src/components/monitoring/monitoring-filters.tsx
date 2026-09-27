"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const ALL_VALUE = "__all__";

export function MonitoringFilters({
  years,
  events,
}: {
  years: number[];
  events: { id: string; title: string }[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function setParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value === ALL_VALUE) {
      params.delete(key);
    } else {
      params.set(key, value);
    }
    router.push(`${pathname}?${params.toString()}`);
  }

  const currentYear = searchParams.get("year") ?? ALL_VALUE;
  const currentEvent = searchParams.get("event") ?? ALL_VALUE;
  const currentStatus = searchParams.get("status") ?? ALL_VALUE;

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      <Select value={currentYear} onValueChange={(v) => setParam("year", v)}>
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Semua Tahun" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL_VALUE}>Semua Tahun</SelectItem>
          {years.map((y) => (
            <SelectItem key={y} value={String(y)}>
              {y}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={currentEvent} onValueChange={(v) => setParam("event", v)}>
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Semua Kegiatan" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL_VALUE}>Semua Kegiatan</SelectItem>
          {events.map((e) => (
            <SelectItem key={e.id} value={e.id}>
              {e.title}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={currentStatus} onValueChange={(v) => setParam("status", v)}>
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Semua Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL_VALUE}>Semua Status</SelectItem>
          <SelectItem value="HADIR">Hadir</SelectItem>
          <SelectItem value="TIDAK_HADIR">Tidak Hadir</SelectItem>
          <SelectItem value="IZIN">Izin</SelectItem>
          <SelectItem value="SAKIT">Sakit</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
