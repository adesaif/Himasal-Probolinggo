"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Plus, Pencil, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
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
import { GalleryFormDialog } from "@/components/admin/gallery-form-dialog";
import { createClient } from "@/lib/supabase/client";
import { cleanupStorageFileIfUnused } from "@/lib/storage-cleanup";

type GalleryRow = {
  id: string;
  image_url: string;
  caption: string | null;
  display_order: number;
  is_published: boolean;
};

export function GalleryList() {
  const [rows, setRows] = useState<GalleryRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setIsLoading(true);
      setError(null);
      const supabase = createClient();

      const { data, error } = await supabase
        .from("gallery_items")
        .select("id, image_url, caption, display_order, is_published")
        .order("display_order")
        .order("created_at", { ascending: false });

      if (cancelled) return;

      if (error) {
        setError(error.message);
        setRows([]);
      } else {
        setRows(data ?? []);
      }
      setIsLoading(false);
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  async function handleDelete(row: GalleryRow) {
    setBusyId(row.id);
    const supabase = createClient();
    const { error } = await supabase.from("gallery_items").delete().eq("id", row.id);

    if (error) {
      setBusyId(null);
      toast.error("Gagal menghapus foto", { description: error.message });
      return;
    }

    await cleanupStorageFileIfUnused(supabase, row.image_url, async () => {
      const { count } = await supabase
        .from("gallery_items")
        .select("id", { count: "exact", head: true })
        .eq("image_url", row.image_url);
      return (count ?? 0) > 0;
    });

    setBusyId(null);
    toast.success("Foto berhasil dihapus permanen");
    setReloadKey((k) => k + 1);
  }

  async function togglePublished(row: GalleryRow) {
    setBusyId(row.id);
    const supabase = createClient();
    const { error } = await supabase
      .from("gallery_items")
      .update({ is_published: !row.is_published })
      .eq("id", row.id);
    setBusyId(null);

    if (error) {
      toast.error("Gagal mengubah status", { description: error.message });
      return;
    }
    toast.success(row.is_published ? "Foto disembunyikan" : "Foto ditampilkan kembali");
    setReloadKey((k) => k + 1);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Galeri</h1>
        <GalleryFormDialog
          trigger={
            <Button>
              <Plus />
              Tambah Foto
            </Button>
          }
        />
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="aspect-square w-full" />
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
            Belum ada foto. Klik &quot;Tambah Foto&quot; untuk mengunggah yang pertama.
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {rows.map((row) => (
            <Card key={row.id} className="overflow-hidden">
              <div className="relative aspect-square">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={row.image_url}
                  alt={row.caption ?? "Foto galeri"}
                  className="size-full object-cover"
                />
                {!row.is_published ? (
                  <span className="absolute top-2 left-2 rounded-full bg-neutral-900/70 px-2 py-0.5 text-xs font-medium text-white">
                    Tersembunyi
                  </span>
                ) : null}
              </div>
              <CardContent className="flex flex-col gap-2 p-3">
                {row.caption ? (
                  <p className="line-clamp-1 text-sm">{row.caption}</p>
                ) : null}
                <div className="flex flex-wrap gap-1.5">
                  <GalleryFormDialog
                    editing={row}
                    trigger={
                      <Button variant="outline" size="sm" disabled={busyId === row.id}>
                        <Pencil />
                      </Button>
                    }
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={busyId === row.id}
                    onClick={() => togglePublished(row)}
                  >
                    {row.is_published ? "Sembunyikan" : "Tampilkan"}
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="destructive"
                        size="sm"
                        disabled={busyId === row.id}
                        aria-label="Hapus Permanen"
                      >
                        <Trash2 />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>
                          Hapus permanen foto {row.caption ? `"${row.caption}"` : "ini"}?
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                          Apakah Anda yakin ingin menghapus permanen foto ini?
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
