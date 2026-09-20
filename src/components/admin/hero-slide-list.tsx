"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, ArrowUp, ArrowDown } from "lucide-react";

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
import { HeroSlideFormDialog } from "@/components/admin/hero-slide-form-dialog";
import { createClient } from "@/lib/supabase/client";

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

  async function handleDelete(id: string) {
    setBusyId(id);
    const supabase = createClient();
    const { error } = await supabase.from("hero_slides").delete().eq("id", id);
    setBusyId(null);

    if (error) {
      toast.error("Gagal menghapus", { description: error.message });
      return;
    }
    toast.success("Wallpaper berhasil dihapus");
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Hero Wallpaper</h1>
          <p className="text-sm text-muted-foreground">
            Kelola foto/wallpaper carousel hero beranda. Jika belum ada wallpaper
            aktif, beranda menampilkan background gradient premium.
          </p>
        </div>
        <HeroSlideFormDialog
          trigger={
            <Button>
              <Plus />
              Tambah Wallpaper
            </Button>
          }
        />
      </div>

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
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Hapus wallpaper ini?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Wallpaper &quot;{row.alt_text}&quot; akan dihapus permanen
                          dan tidak bisa dikembalikan.
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
