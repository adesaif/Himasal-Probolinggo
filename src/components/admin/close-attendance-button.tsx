"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { createClient } from "@/lib/supabase/client";
import { formatDateTimeID } from "@/lib/format-date";

export function CloseAttendanceButton({
  eventId,
  startAt,
  endAt,
  closedAt,
}: {
  eventId: string;
  startAt: string;
  endAt: string | null;
  closedAt: string | null;
}) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (closedAt) {
    return (
      <p className="text-sm text-muted-foreground">
        Absensi ditutup pada {formatDateTimeID(closedAt)}. Alumni aktif yang tidak
        memiliki catatan kehadiran sudah ditandai TIDAK_HADIR.
      </p>
    );
  }

  const eventEnded = new Date(endAt ?? startAt).getTime() < new Date().getTime();

  async function handleClose() {
    setIsSubmitting(true);
    const supabase = createClient();
    const { data, error } = await supabase.rpc("admin_close_event_attendance", {
      p_event_id: eventId,
    });
    setIsSubmitting(false);

    if (error) {
      toast.error("Gagal menutup absensi", { description: error.message });
      return;
    }

    toast.success(`Absensi ditutup. ${data ?? 0} alumni ditandai TIDAK_HADIR.`);
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-1">
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button variant="outline" disabled={!eventEnded} className="w-fit">
            Tutup Absensi
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Tutup absensi untuk kegiatan ini?</AlertDialogTitle>
            <AlertDialogDescription>
              Seluruh alumni aktif yang belum memiliki catatan kehadiran
              (HADIR/IZIN/SAKIT) akan otomatis ditandai TIDAK_HADIR. Tindakan ini
              tidak bisa dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction disabled={isSubmitting} onClick={handleClose}>
              {isSubmitting ? "Memproses..." : "Ya, Tutup Absensi"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      {!eventEnded ? (
        <p className="text-xs text-muted-foreground">
          Absensi hanya bisa ditutup setelah kegiatan selesai.
        </p>
      ) : null}
    </div>
  );
}
