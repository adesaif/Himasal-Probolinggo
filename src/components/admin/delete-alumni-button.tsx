"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { createClient } from "@/lib/supabase/client";
import { ROLE_LABEL, type Role } from "@/lib/constants";

export type DeleteAlumniTarget = {
  id: string;
  nama: string | null;
  alamat: string | null;
  angkatan: number | null;
  jumlahAbsensi: number;
  hasAccount: boolean;
  /** Role staf akun yang terhubung - Alumni ber-role staf tidak bisa dihapus. */
  staffRole?: Role | null;
};

/**
 * Hapus alumni dengan konfirmasi. Benar-benar menghapus baris `alumni` di
 * database lewat RPC admin_delete_alumni (tidak ada policy DELETE langsung).
 * Riwayat absensi ikut terhapus karena FK attendance_records memang ON
 * DELETE CASCADE sejak awal - jumlahnya ditampilkan sebelum admin
 * mengonfirmasi. Akun login (kalau ada) tidak ikut dihapus.
 */
export function DeleteAlumniButton({
  target,
  onDeleted,
  size = "sm",
}: {
  target: DeleteAlumniTarget;
  onDeleted: () => void;
  size?: "sm" | "default";
}) {
  const [open, setOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    setIsDeleting(true);
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.rpc("admin_delete_alumni", { p_alumni_id: target.id });
    setIsDeleting(false);

    if (error) {
      setError(error.message);
      return;
    }

    setOpen(false);
    toast.success("Alumni berhasil dihapus");
    onDeleted();
  }

  return (
    <AlertDialog
      open={open}
      onOpenChange={(next) => {
        if (isDeleting) return;
        setOpen(next);
        if (next) setError(null);
      }}
    >
      <AlertDialogTrigger asChild>
        <Button
          variant="outline"
          size={size}
          className="text-destructive hover:bg-destructive/10 hover:text-destructive"
        >
          <Trash2 />
          Hapus
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Hapus Alumni?</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="flex flex-col gap-3">
              <div className="rounded-md border bg-muted/40 px-3 py-2 text-left">
                <p className="font-medium text-foreground">{target.nama || "(Tanpa nama)"}</p>
                <p className="text-xs">
                  {target.alamat ?? "Alamat belum diisi"}
                  {target.angkatan ? ` · Angkatan ${target.angkatan}` : ""}
                </p>
              </div>
              <p>Data alumni ini akan dihapus permanen dari database.</p>
              {target.jumlahAbsensi > 0 ? (
                <p className="text-destructive">
                  {target.jumlahAbsensi} catatan absensi milik alumni ini ikut terhapus.
                </p>
              ) : null}
              {target.hasAccount && !target.staffRole ? (
                <p>Akun login alumni ini tidak ikut dihapus.</p>
              ) : null}
              {target.staffRole ? (
                <p className="text-destructive">
                  Alumni ini sedang ber-role {ROLE_LABEL[target.staffRole]} dan tidak dapat
                  dihapus. Kembalikan ke Alumni terlebih dahulu.
                </p>
              ) : null}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        {error ? (
          <p role="alert" className="text-sm text-destructive">
            Gagal menghapus: {error}
          </p>
        ) : null}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Batal</AlertDialogCancel>
          <Button
            variant="destructive"
            disabled={isDeleting || Boolean(target.staffRole)}
            onClick={handleDelete}
          >
            {isDeleting ? "Menghapus..." : "Hapus"}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
