"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Plus, Pencil, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
import { StructureFormDialog } from "@/components/admin/structure-form-dialog";
import { createClient } from "@/lib/supabase/client";

type StructureRow = {
  id: string;
  nama: string;
  jabatan: string;
  foto_url: string | null;
  display_order: number;
  is_active: boolean;
};

export function StructureList({ rows }: { rows: StructureRow[] }) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);

  async function toggleActive(row: StructureRow) {
    setBusyId(row.id);
    const supabase = createClient();
    const { error } = await supabase
      .from("organization_structure")
      .update({ is_active: !row.is_active })
      .eq("id", row.id);
    setBusyId(null);

    if (error) {
      toast.error("Gagal mengubah status", { description: error.message });
      return;
    }
    toast.success(row.is_active ? "Dinonaktifkan" : "Diaktifkan kembali");
    router.refresh();
  }

  async function handleDelete(id: string) {
    setBusyId(id);
    const supabase = createClient();
    const { error } = await supabase.from("organization_structure").delete().eq("id", id);
    setBusyId(null);

    if (error) {
      toast.error("Gagal menghapus", { description: error.message });
      return;
    }
    toast.success("Data berhasil dihapus");
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Struktur Organisasi</h1>
        <StructureFormDialog
          trigger={
            <Button>
              <Plus />
              Tambah Pengurus
            </Button>
          }
        />
      </div>

      {rows.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            Belum ada data struktur organisasi.
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-2">
          {rows.map((row) => (
            <Card key={row.id}>
              <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                  {row.foto_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={row.foto_url}
                      alt={row.nama}
                      className="size-12 rounded-full object-cover"
                    />
                  ) : (
                    <div className="flex size-12 items-center justify-center rounded-full bg-muted text-sm font-medium">
                      {row.nama.charAt(0)}
                    </div>
                  )}
                  <div>
                    <p className="font-medium">{row.nama}</p>
                    <p className="text-sm text-muted-foreground">{row.jabatan}</p>
                  </div>
                  <span
                    className={
                      row.is_active
                        ? "rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800 dark:bg-green-900/40 dark:text-green-300"
                        : "rounded-full bg-neutral-100 px-2.5 py-0.5 text-xs font-medium text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300"
                    }
                  >
                    {row.is_active ? "Aktif" : "Nonaktif"}
                  </span>
                </div>
                <div className="flex gap-2">
                  <StructureFormDialog
                    editing={row}
                    trigger={
                      <Button variant="outline" size="sm" disabled={busyId === row.id}>
                        <Pencil />
                        Edit
                      </Button>
                    }
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={busyId === row.id}
                    onClick={() => toggleActive(row)}
                  >
                    {row.is_active ? "Nonaktifkan" : "Aktifkan"}
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" size="sm" disabled={busyId === row.id}>
                        <Trash2 />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Hapus data ini?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Data &quot;{row.nama}&quot; akan dihapus permanen dan tidak bisa
                          dikembalikan.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Batal</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleDelete(row.id)}>
                          Ya, hapus
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
