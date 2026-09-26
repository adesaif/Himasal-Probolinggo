"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowLeft, Pencil, Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
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
import { TopicContentFormDialog } from "@/components/admin/topic-content-form-dialog";
import { createClient } from "@/lib/supabase/client";
import { cleanupStorageFileIfUnused } from "@/lib/storage-cleanup";

type ContentRow = {
  id: string;
  title: string;
  description: string | null;
  image_url: string | null;
  link_url: string | null;
  display_order: number;
  is_active: boolean;
  is_featured: boolean;
  is_popular: boolean;
};

export function TopicContentList({
  topicId,
  topicLabel,
  featuredAllowed,
}: {
  topicId: string;
  topicLabel: string;
  featuredAllowed: boolean;
}) {
  const [rows, setRows] = useState<ContentRow[]>([]);
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
        .from("topic_content")
        .select(
          "id, title, description, image_url, link_url, display_order, is_active, is_featured, is_popular",
        )
        .eq("topic_id", topicId)
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
  }, [topicId, reloadKey]);

  async function handleDelete(row: ContentRow) {
    setBusyId(row.id);
    const supabase = createClient();
    const { error } = await supabase.from("topic_content").delete().eq("id", row.id);

    if (error) {
      setBusyId(null);
      toast.error("Gagal menghapus konten", { description: error.message });
      return;
    }

    if (row.image_url) {
      await cleanupStorageFileIfUnused(supabase, row.image_url, async () => {
        const { count } = await supabase
          .from("topic_content")
          .select("id", { count: "exact", head: true })
          .eq("image_url", row.image_url as string);
        return (count ?? 0) > 0;
      });
    }

    setBusyId(null);
    toast.success("Konten berhasil dihapus permanen");
    setReloadKey((k) => k + 1);
  }

  async function toggleActive(row: ContentRow) {
    setBusyId(row.id);
    const supabase = createClient();
    const { error } = await supabase
      .from("topic_content")
      .update({ is_active: !row.is_active })
      .eq("id", row.id);
    setBusyId(null);

    if (error) {
      toast.error("Gagal mengubah status", { description: error.message });
      return;
    }
    toast.success(row.is_active ? "Konten disembunyikan" : "Konten ditampilkan kembali");
    setReloadKey((k) => k + 1);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Button asChild variant="ghost" size="sm" className="w-fit">
          <Link href="/admin/konten/topik">
            <ArrowLeft />
            Kembali ke Topik & Navigasi
          </Link>
        </Button>
        <AdminPageHeader
          title={`Kelola Konten: ${topicLabel}`}
          description={`Konten yang Aktif otomatis tampil di section "${topicLabel}" di Beranda dan halaman publik topik ini.`}
          actions={
            <TopicContentFormDialog
              topicId={topicId}
              featuredAllowed={featuredAllowed}
              trigger={
                <Button>
                  <Plus />
                  Tambah Konten
                </Button>
              }
            />
          }
        />
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-48 w-full" />
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
            Belum ada konten. Klik &quot;Tambah Konten&quot; untuk menambahkan yang
            pertama.
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {/* Card bawaan punya py-6 + gap-6 (ui/card.tsx) - dinolkan di
              sini supaya foto benar-benar rapat ke tepi Card, bukan
              ke-inset oleh padding default (CardContent di bawah sudah
              punya padding sendiri lewat p-3). */}
          {rows.map((row) => (
            <Card key={row.id} className="gap-0 overflow-hidden py-0">
              <div className="relative aspect-video">
                {row.image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={row.image_url}
                    alt={row.title}
                    className="size-full object-cover"
                  />
                ) : (
                  <div className="flex size-full items-center justify-center bg-muted text-xs text-muted-foreground">
                    Tidak ada gambar
                  </div>
                )}
                {!row.is_active ? (
                  <span className="absolute top-2 left-2 rounded-full bg-neutral-900/70 px-2 py-0.5 text-xs font-medium text-white">
                    Tersembunyi
                  </span>
                ) : null}
                {row.is_featured || row.is_popular ? (
                  <span className="absolute top-2 right-2 flex flex-col items-end gap-1">
                    {row.is_featured ? (
                      <span className="rounded-full bg-primary/90 px-2 py-0.5 text-xs font-medium text-primary-foreground">
                        Unggulan
                      </span>
                    ) : null}
                    {row.is_popular ? (
                      <span className="rounded-full bg-primary/90 px-2 py-0.5 text-xs font-medium text-primary-foreground">
                        Populer
                      </span>
                    ) : null}
                  </span>
                ) : null}
              </div>
              <CardContent className="flex flex-col gap-2 p-3">
                <p className="line-clamp-1 font-medium">{row.title}</p>
                {row.description ? (
                  <p className="line-clamp-2 text-sm text-muted-foreground">
                    {row.description}
                  </p>
                ) : null}
                <div className="flex flex-wrap gap-1.5">
                  <TopicContentFormDialog
                    topicId={topicId}
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
                    {row.is_active ? "Sembunyikan" : "Tampilkan"}
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
                          Hapus permanen konten &quot;{row.title}&quot;?
                        </AlertDialogTitle>
                        <AlertDialogDescription>
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
