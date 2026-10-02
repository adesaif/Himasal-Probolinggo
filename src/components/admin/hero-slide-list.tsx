"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, ArrowUp, ArrowDown } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
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
import { HeroSlideFormDialog } from "@/components/admin/hero-slide-form-dialog";
import { createClient } from "@/lib/supabase/client";
import { cleanupStorageFileIfUnused } from "@/lib/storage-cleanup";

type HeroSlideRow = {
  id: string;
  image_url: string;
  alt_text: string;
  display_order: number;
  is_active: boolean;
};

export function HeroSlideList({ rows }: { rows: HeroSlideRow[] }) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);

  async function toggleActive(row: HeroSlideRow) {
    setBusyId(row.id);
    const supabase = createClient();
    const { error } = await supabase
      .from("hero_slides")
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

  async function handleDelete(row: HeroSlideRow) {
    setBusyId(row.id);
    const supabase = createClient();
    const { error } = await supabase.from("hero_slides").delete().eq("id", row.id);

    if (error) {
      setBusyId(null);
      toast.error("Gagal menghapus", { description: error.message });
      return;
    }

    await cleanupStorageFileIfUnused(supabase, row.image_url, async () => {
      const { count } = await supabase
        .from("hero_slides")
        .select("id", { count: "exact", head: true })
        .eq("image_url", row.image_url);
      return (count ?? 0) > 0;
    });

    setBusyId(null);
    toast.success("Wallpaper berhasil dihapus permanen");
    router.refresh();
  }

  async function move(row: HeroSlideRow, direction: "up" | "down") {
    const index = rows.findIndex((r) => r.id === row.id);
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    const target = rows[targetIndex];
    if (!target) return;

    setBusyId(row.id);
    const supabase = createClient();
    const [{ error: error1 }, { error: error2 }] = await Promise.all([
      supabase
        .from("hero_slides")
        .update({ display_order: target.display_order })
        .eq("id", row.id),
      supabase
        .from("hero_slides")
        .update({ display_order: row.display_order })
        .eq("id", target.id),
    ]);
    setBusyId(null);

    if (error1 || error2) {
      toast.error("Gagal mengubah urutan", {
        description: error1?.message || error2?.message,
      });
      return;
    }
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-4">
      <Card className="border-warning/40 bg-warning/5">
        <CardContent className="text-sm">
          <p className="font-medium text-warning-foreground">
            Fitur ini sudah digantikan oleh Featured Content
          </p>
          <p className="mt-1 text-muted-foreground">
            Hero Carousel di Beranda sekarang otomatis mengambil dari Berita
            atau Agenda yang ditandai <strong>Unggulan</strong> (lihat{" "}
            <code>/admin/berita</code> atau <code>/admin/agenda</code>), bukan
            dari wallpaper manual di halaman ini. Data di bawah dipertahankan
            sebagai arsip/kompatibilitas dan tidak lagi tampil di halaman
            publik mana pun.
          </p>
        </CardContent>
      </Card>

      <AdminPageHeader
        title="Hero Wallpaper (Legacy)"
        description="Kelola foto/wallpaper carousel hero beranda versi lama. Tidak lagi dipakai oleh halaman publik - lihat catatan di atas."
        actions={
          <HeroSlideFormDialog
            trigger={
              <Button>
                <Plus />
                Tambah Wallpaper
              </Button>
            }
          />
        }
      />

      {rows.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            Belum ada wallpaper. Beranda akan menampilkan background gradient
            premium sampai wallpaper ditambahkan.
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-2">
          {rows.map((row, index) => (
            <Card key={row.id}>
              <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={row.image_url}
                    alt={row.alt_text}
                    className="h-16 w-28 rounded-md border object-cover"
                  />
                  <div>
                    <p className="line-clamp-1 font-medium">{row.alt_text}</p>
                    <p className="text-xs text-muted-foreground">
                      Urutan: {row.display_order}
                    </p>
                  </div>
                  <Badge variant={row.is_active ? "success" : "neutral"}>
                    {row.is_active ? "Aktif" : "Nonaktif"}
                  </Badge>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={busyId === row.id || index === 0}
                    onClick={() => move(row, "up")}
                    aria-label="Naikkan urutan"
                  >
                    <ArrowUp />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={busyId === row.id || index === rows.length - 1}
                    onClick={() => move(row, "down")}
                    aria-label="Turunkan urutan"
                  >
                    <ArrowDown />
                  </Button>
                  <HeroSlideFormDialog
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
                        Hapus Permanen
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>
                          Hapus permanen &quot;{row.alt_text}&quot;?
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                          Apakah Anda yakin ingin menghapus permanen wallpaper
                          ini? Tindakan ini tidak dapat dibatalkan.
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
