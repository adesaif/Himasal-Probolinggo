"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, ArrowUp, ArrowDown, Newspaper } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
import { CategoryFormDialog } from "@/components/admin/category-form-dialog";
import { createClient } from "@/lib/supabase/client";

type CategoryRow = {
  id: string;
  name: string;
  slug: string;
  tagline: string | null;
  display_order: number;
  is_active: boolean;
  show_on_homepage: boolean;
};

export function CategoryList({ rows }: { rows: CategoryRow[] }) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);

  async function toggleField(row: CategoryRow, field: "is_active" | "show_on_homepage") {
    setBusyId(row.id);
    const supabase = createClient();
    const payload =
      field === "is_active"
        ? { is_active: !row.is_active }
        : { show_on_homepage: !row.show_on_homepage };
    const { error } = await supabase.from("categories").update(payload).eq("id", row.id);
    setBusyId(null);

    if (error) {
      toast.error("Gagal mengubah status", { description: error.message });
      return;
    }
    toast.success("Status berhasil diubah");
    router.refresh();
  }

  async function handleDelete(id: string) {
    setBusyId(id);
    const supabase = createClient();
    const { error } = await supabase.from("categories").delete().eq("id", id);
    setBusyId(null);

    if (error) {
      toast.error("Gagal menghapus", { description: error.message });
      return;
    }
    toast.success("Kategori berhasil dihapus");
    router.refresh();
  }

  async function move(row: CategoryRow, direction: "up" | "down") {
    const index = rows.findIndex((r) => r.id === row.id);
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    const target = rows[targetIndex];
    if (!target) return;

    setBusyId(row.id);
    const supabase = createClient();
    const [{ error: error1 }, { error: error2 }] = await Promise.all([
      supabase
        .from("categories")
        .update({ display_order: target.display_order })
        .eq("id", row.id),
      supabase
        .from("categories")
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
          <h1 className="text-2xl font-semibold tracking-tight">Kategori Berita</h1>
          <p className="text-sm text-muted-foreground">
            Kategori aktif dan tampil di Beranda akan otomatis muncul sebagai
            section di halaman utama, berisi berita published dengan
            kategori tersebut.
          </p>
        </div>
        <CategoryFormDialog
          trigger={
            <Button>
              <Plus />
              Tambah Kategori
            </Button>
          }
        />
      </div>

      {rows.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            Belum ada kategori. Tambahkan kategori supaya berita bisa
            dikelompokkan di Beranda.
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-2">
          {rows.map((row, index) => (
            <Card key={row.id}>
              <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium">{row.name}</p>
                    <Badge variant={row.is_active ? "success" : "neutral"}>
                      {row.is_active ? "Aktif" : "Nonaktif"}
                    </Badge>
                    <Badge variant={row.show_on_homepage ? "primary" : "neutral"}>
                      {row.show_on_homepage ? "Tampil di Beranda" : "Disembunyikan"}
                    </Badge>
                  </div>
                  {row.tagline ? (
                    <p className="mt-1 line-clamp-1 text-sm text-muted-foreground">
                      {row.tagline}
                    </p>
                  ) : null}
                  <p className="text-xs text-muted-foreground">Urutan: {row.display_order}</p>
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
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/admin/berita?category=${row.slug}`}>
                      <Newspaper />
                      Kelola Berita
                    </Link>
                  </Button>
                  <CategoryFormDialog
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
                    onClick={() => toggleField(row, "is_active")}
                  >
                    {row.is_active ? "Nonaktifkan" : "Aktifkan"}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={busyId === row.id}
                    onClick={() => toggleField(row, "show_on_homepage")}
                  >
                    {row.show_on_homepage ? "Sembunyikan dari Beranda" : "Tampilkan di Beranda"}
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
                          Hapus permanen &quot;{row.name}&quot;?
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                          Apakah Anda yakin ingin menghapus permanen kategori
                          ini? Tindakan ini tidak dapat dibatalkan. Berita yang
                          memakai kategori ini akan menjadi tanpa kategori
                          (berita itu sendiri TIDAK ikut terhapus).
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Batal</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleDelete(row.id)}>
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
