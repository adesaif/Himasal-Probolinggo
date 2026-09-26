"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/client";
import { formatEventRange } from "@/lib/format-date";

type EventRow = {
  id: string;
  title: string;
  start_at: string;
  end_at: string | null;
  is_mandatory: boolean;
  status: string;
  attendance_closed_at: string | null;
};

type Counts = { HADIR: number; TIDAK_HADIR: number; IZIN: number; SAKIT: number };

export function AttendanceEventList() {
  const [events, setEvents] = useState<EventRow[]>([]);
  const [counts, setCounts] = useState<Record<string, Counts>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setIsLoading(true);
      setError(null);
      const supabase = createClient();

      const { data: eventRows, error: eventsError } = await supabase
        .from("events")
        .select("id, title, start_at, end_at, is_mandatory, status, attendance_closed_at")
        .order("start_at", { ascending: false })
        .limit(50);

      if (cancelled) return;

      if (eventsError) {
        setError(eventsError.message);
        setIsLoading(false);
        return;
      }

      const ids = (eventRows ?? []).map((e) => e.id);
      const { data: attendanceRows } = ids.length
        ? await supabase.from("attendance_records").select("event_id, status").in("event_id", ids)
        : { data: [] };

      if (cancelled) return;

      const nextCounts: Record<string, Counts> = {};
      for (const row of attendanceRows ?? []) {
        const bucket = (nextCounts[row.event_id] ??= {
          HADIR: 0,
          TIDAK_HADIR: 0,
          IZIN: 0,
          SAKIT: 0,
        });
        if (row.status in bucket) {
          bucket[row.status as keyof Counts] += 1;
        }
      }

      setEvents(eventRows ?? []);
      setCounts(nextCounts);
      setIsLoading(false);
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  if (isLoading) {
    return (
      <div className="flex flex-col gap-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-sm text-destructive">
          Gagal memuat data: {error}
        </CardContent>
      </Card>
    );
  }

  if (events.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-sm text-muted-foreground">
          Belum ada kegiatan. Buat kegiatan di menu Agenda terlebih dahulu.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {events.map((event) => {
        const c = counts[event.id];
        return (
          <Link key={event.id} href={`/admin/absensi/${event.id}`}>
            <Card className="transition-colors hover:bg-muted/50">
              <CardContent className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate font-medium">{event.title}</p>
                    {event.is_mandatory ? <Badge variant="warning">Wajib Hadir</Badge> : null}
                    <Badge variant={event.status === "published" ? "success" : "neutral"}>
                      {event.status === "published" ? "Published" : "Draft"}
                    </Badge>
                    {event.attendance_closed_at ? (
                      <span className="rounded-full bg-neutral-800 px-2.5 py-0.5 text-xs font-medium text-white dark:bg-neutral-200 dark:text-neutral-900">
                        Ditutup
                      </span>
                    ) : null}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {formatEventRange(event.start_at, event.end_at)}
                  </p>
                </div>
                <div className="flex shrink-0 flex-wrap gap-3 text-xs text-muted-foreground">
                  <span>Hadir: {c?.HADIR ?? 0}</span>
                  <span>Tidak Hadir: {c?.TIDAK_HADIR ?? 0}</span>
                  <span>Izin: {c?.IZIN ?? 0}</span>
                  <span>Sakit: {c?.SAKIT ?? 0}</span>
                </div>
              </CardContent>
            </Card>
          </Link>
        );
      })}
    </div>
  );
}
