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

export function AlumniStatusToggle({
  alumniId,
  currentStatus,
}: {
  alumniId: string;
  currentStatus: string;
}) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const nextStatus = currentStatus === "aktif" ? "nonaktif" : "aktif";

  async function handleConfirm() {
    setIsSubmitting(true);
    const supabase = createClient();

    const { error } = await supabase.rpc("admin_set_alumni_status", {
      p_alumni_id: alumniId,
      p_status: nextStatus,
    });

    setIsSubmitting(false);

    if (error) {
      toast.error("Gagal mengubah status", { description: error.message });
      return;
    }

    toast.success(
      nextStatus === "aktif"
        ? "Alumni diaktifkan kembali"
        : "Alumni dinonaktifkan",
    );
    router.refresh();
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant={nextStatus === "nonaktif" ? "destructive" : "default"}>
          {currentStatus === "aktif" ? "Nonaktifkan" : "Aktifkan"}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {currentStatus === "aktif"
              ? "Nonaktifkan alumni ini?"
              : "Aktifkan kembali alumni ini?"}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {currentStatus === "aktif"
              ? "Alumni yang dinonaktifkan tidak akan dihitung sebagai anggota aktif dalam laporan/statistik."
              : "Alumni akan dihitung kembali sebagai anggota aktif."}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isSubmitting}>Batal</AlertDialogCancel>
          <AlertDialogAction disabled={isSubmitting} onClick={handleConfirm}>
            {isSubmitting ? "Memproses..." : "Ya, lanjutkan"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
