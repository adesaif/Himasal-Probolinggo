import type { Metadata } from "next";
import Link from "next/link";
import { CalendarDays, MapPin } from "lucide-react";

import { createPublicClient } from "@/lib/supabase/public";
import { Card, CardContent } from "@/components/ui/card";
import { formatEventRange } from "@/lib/format-date";

export const metadata: Metadata = {
  title: "Agenda",
  description: "Jadwal kegiatan HIMASAL Probolinggo.",
};

export const revalidate = 300;

export default async function AgendaPage() {
  const supabase = createPublicClient();
  const { data: events, error } = await supabase
    .from("events")
    .select("id, title, location, start_at, end_at, is_mandatory")
    .eq("status", "published")
    .order("start_at", { ascending: false });

  const now = new Date().getTime();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Agenda</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Jadwal kegiatan HIMASAL Probolinggo.
        </p>
      </div>

      {error ? (
        <Card>
          <CardContent className="py-8 text-center text-sm text-destructive">
            Gagal memuat agenda. Silakan coba lagi nanti.
          </CardContent>
        </Card>
      ) : !events || events.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            Belum ada agenda yang dipublikasikan.
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {events.map((event) => {
            const isUpcoming = new Date(event.end_at ?? event.start_at).getTime() >= now;
            return (
              <Link key={event.id} href={`/agenda/${event.id}`}>
                <Card className="transition-colors hover:bg-muted/50">
                  <CardContent className="flex flex-col gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={
                          isUpcoming
                            ? "rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800 dark:bg-green-900/40 dark:text-green-300"
                            : "rounded-full bg-neutral-100 px-2.5 py-0.5 text-xs font-medium text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300"
                        }
                      >
                        {isUpcoming ? "Akan Datang" : "Selesai"}
                      </span>
                      {event.is_mandatory ? (
                        <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
                          Wajib Hadir
                        </span>
                      ) : null}
                    </div>
                    <p className="font-medium">{event.title}</p>
                    <div className="flex flex-col gap-1 text-sm text-muted-foreground sm:flex-row sm:gap-4">
                      <span className="flex items-center gap-1.5">
                        <CalendarDays className="size-4" aria-hidden="true" />
                        {formatEventRange(event.start_at, event.end_at)}
                      </span>
                      {event.location ? (
                        <span className="flex items-center gap-1.5">
                          <MapPin className="size-4" aria-hidden="true" />
                          {event.location}
                        </span>
                      ) : null}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
