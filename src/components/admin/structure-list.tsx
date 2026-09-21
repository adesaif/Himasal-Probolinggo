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
import { cleanupStorageFileIfUnused } from "@/lib/storage-cleanup";

type StructureRow = {
  id: string;
  nama: string;
  jabatan: string;
  foto_url: string | null;
  display_order: number;
  is_active: boolean;
  is_featured: boolean;
};

export function StructureList({
  rows,
  featuredAllowed,
}: {
  rows: StructureRow[];
  featuredAllowed: boolean;
}) {
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

  async function handleDelete(row: StructureRow) {
    setBusyId(row.id);
    const supabase = createClient();
    const { error } = await supabase.from("organization_structure").delete().eq("id", row.id);

    if (error) {
      setBusyId(null);
      toast.error("Gagal menghapus", { description: error.message });
      return;
    }

    await cleanupStorageFileIfUnused(supabase, row.foto_url, async () => {
      const { count } = await supabase
        .from("organization_structure")
        .select("id", { count: "exact", head: true })
        .eq("foto_url", row.foto_url as string);
      return (count ?? 0) > 0;
    });

    setBusyId(null);
    toast.success("Data berhasil dihapus permanen");
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Struktur Organisasi</h1>
        <StructureFormDialog
          featuredAllowed={featuredAllowed}
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
                  {row.is_featured ? (
                    <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                      Unggulan
                    </span>
                  ) : null}
                </div>
                <div className="flex gap-2">
                  <StructureFormDialog
                    editing={row}
                    featuredAllowed={featuredAllowed}
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
                        Hapus Permanen
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>
                          Hapus permanen &quot;{row.nama}&quot;?
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                          Apakah Anda yakin ingin menghapus permanen data ini?
                          Tindakan ini tidak dapat dibatalkan.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Batal</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleDelete(row)}>
                          Ya, Hapus Permanen
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
