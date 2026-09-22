import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDateID } from "@/lib/format-date";

export type RecentEventRow = {
  id: string;
  title: string;
  start_at: string;
  is_mandatory: boolean;
  hadir: number;
  tidak_hadir: number;
  izin: number;
  sakit: number;
  belum_absen: number;
};

export function RecentEventsTable({
  events,
  emptyMessage = "Belum ada kegiatan untuk filter yang dipilih.",
}: {
  events: RecentEventRow[];
  emptyMessage?: string;
}) {
  if (events.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-sm text-muted-foreground">
          {emptyMessage}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="w-full text-sm">
        <thead className="bg-muted/50 text-left text-xs text-muted-foreground">
          <tr>
            <th className="px-3 py-2 font-medium">Kegiatan</th>
            <th className="px-3 py-2 font-medium">Tanggal</th>
            <th className="px-3 py-2 font-medium">Wajib Hadir</th>
            <th className="px-3 py-2 text-right font-medium">Hadir</th>
            <th className="px-3 py-2 text-right font-medium">Tidak Hadir</th>
            <th className="px-3 py-2 text-right font-medium">Izin</th>
            <th className="px-3 py-2 text-right font-medium">Sakit</th>
            <th className="px-3 py-2 text-right font-medium">Belum Absen</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {events.map((event) => (
            <tr key={event.id}>
              <td className="max-w-48 truncate px-3 py-2 font-medium">{event.title}</td>
              <td className="px-3 py-2 text-muted-foreground">{formatDateID(event.start_at)}</td>
              <td className="px-3 py-2">
                {event.is_mandatory ? (
                  <Badge variant="warning">Wajib</Badge>
                ) : (
                  <span className="text-xs text-muted-foreground">Opsional</span>
                )}
              </td>
              <td className="px-3 py-2 text-right tabular-nums">{event.hadir}</td>
              <td className="px-3 py-2 text-right tabular-nums">{event.tidak_hadir}</td>
              <td className="px-3 py-2 text-right tabular-nums">{event.izin}</td>
              <td className="px-3 py-2 text-right tabular-nums">{event.sakit}</td>
              <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">
                {event.belum_absen}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
