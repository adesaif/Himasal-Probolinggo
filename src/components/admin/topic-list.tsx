"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { ArrowDown, ArrowUp, FolderOpen, Pencil, Plus, RotateCcw, Trash2 } from "lucide-react";

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
import { TopicFormDialog } from "@/components/admin/topic-form-dialog";
import { TopicCreateDialog } from "@/components/admin/topic-create-dialog";
import { createClient } from "@/lib/supabase/client";
import type { SiteTopic } from "@/lib/topics";

export function TopicList({
  rows,
  contentCounts,
}: {
  rows: SiteTopic[];
  contentCounts: Record<string, number>;
}) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);

  async function toggleActive(topic: SiteTopic) {
    setBusyId(topic.id);
    const supabase = createClient();
    const { error } = await supabase
      .from("site_topics")
      .update({ is_active: !topic.is_active })
      .eq("id", topic.id);
    setBusyId(null);

    if (error) {
      toast.error("Gagal mengubah status", { description: error.message });
      return;
    }
    toast.success("Status topik berhasil diubah");
    router.refresh();
  }

  async function resetToDefault(topic: SiteTopic) {
    setBusyId(topic.id);
    const supabase = createClient();
    const { error } = await supabase
      .from("site_topics")
      .update({
        label: topic.default_label,
        description: topic.default_description,
        display_order: topic.default_display_order,
        is_active: topic.default_is_active,
        allow_featured: topic.default_allow_featured,
      })
      .eq("id", topic.id);
    setBusyId(null);

    if (error) {
      toast.error("Gagal mengembalikan ke default", { description: error.message });
      return;
    }
    toast.success("Topik dikembalikan ke pengaturan default");
    router.refresh();
  }

  async function handleDelete(topic: SiteTopic) {
    setBusyId(topic.id);
    const supabase = createClient();
    const { error } = await supabase.from("site_topics").delete().eq("id", topic.id);
    setBusyId(null);

    if (error) {
      toast.error("Gagal menghapus topik", { description: error.message });
      return;
    }
    toast.success("Topik berhasil dihapus permanen");
    router.refresh();
  }

  async function move(topic: SiteTopic, direction: "up" | "down") {
    const index = rows.findIndex((r) => r.id === topic.id);
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    const target = rows[targetIndex];
    if (!target) return;

    setBusyId(topic.id);
    const supabase = createClient();
    const [{ error: error1 }, { error: error2 }] = await Promise.all([
      supabase
        .from("site_topics")
        .update({ display_order: target.display_order })
        .eq("id", topic.id),
      supabase
        .from("site_topics")
        .update({ display_order: topic.display_order })
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
      <AdminPageHeader
        title="Topik & Navigasi"
        description="Kelola nama, deskripsi, urutan, status aktif, izin Unggulan, dan hapus untuk setiap topik/bagian website. Mengganti nama di sini otomatis tercermin di menu navigasi publik, sidebar Admin, dan judul section Beranda. Menghapus topik hanya menghapus konfigurasinya dari daftar ini - konten yang sudah ada di topik tersebut TIDAK ikut terhapus. Topik baru otomatis mendapat navigasi publik dan section Beranda sendiri begitu punya konten."
        actions={
          <TopicCreateDialog
            trigger={
              <Button>
                <Plus />
                Tambah Topik
              </Button>
            }
          />
        }
      />

      <div className="flex flex-col gap-2">
        {rows.map((topic, index) => {
          const count = contentCounts[topic.id] ?? 0;
          return (
            <Card key={topic.id}>
              <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium">{topic.label}</p>
                    <Badge variant={topic.is_active ? "success" : "neutral"}>
                      {topic.is_active ? "Aktif" : "Nonaktif"}
                    </Badge>
                    <Badge variant={topic.allow_featured ? "primary" : "neutral"}>
                      Unggulan {topic.allow_featured ? "ON" : "OFF"}
                    </Badge>
                  </div>
                  {topic.description ? (
                    <p className="mt-1 line-clamp-1 text-sm text-muted-foreground">
                      {topic.description}
                    </p>
                  ) : null}
                  <p className="text-xs text-muted-foreground">
                    Kunci: {topic.key} {topic.is_system ? "(sistem)" : "(custom)"} · Urutan:{" "}
                    {topic.display_order} ·{" "}
                    {count} konten terkait
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={busyId === topic.id || index === 0}
                    onClick={() => move(topic, "up")}
                    aria-label="Naikkan urutan"
                  >
                    <ArrowUp />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={busyId === topic.id || index === rows.length - 1}
                    onClick={() => move(topic, "down")}
                    aria-label="Turunkan urutan"
                  >
                    <ArrowDown />
                  </Button>
                  <TopicFormDialog
                    topic={topic}
                    trigger={
                      <Button variant="outline" size="sm" disabled={busyId === topic.id}>
                        <Pencil />
                        Edit
                      </Button>
                    }
                  />
                  {!topic.is_system ? (
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/admin/konten/topik/${topic.id}/konten`}>
                        <FolderOpen />
                        Kelola Konten
                      </Link>
                    </Button>
                  ) : null}
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={busyId === topic.id}
                    onClick={() => toggleActive(topic)}
                  >
                    {topic.is_active ? "Nonaktifkan" : "Aktifkan"}
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="outline" size="sm" disabled={busyId === topic.id}>
                        <RotateCcw />
                        Reset ke Default
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Kembalikan topik ini ke default?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Nama, deskripsi, urutan, status aktif, dan izin
                          Unggulan topik &quot;{topic.label}&quot; akan
                          dikembalikan ke pengaturan bawaan sistem. Ini{" "}
                          <strong>tidak menghapus</strong> konten atau data apa
                          pun di topik ini — hanya mengembalikan label dan
                          pengaturannya.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Batal</AlertDialogCancel>
                        <AlertDialogAction onClick={() => resetToDefault(topic)}>
                          Ya, kembalikan ke default
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" size="sm" disabled={busyId === topic.id}>
                        <Trash2 />
                        Hapus
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Hapus Topik &quot;{topic.label}&quot; secara permanen?</AlertDialogTitle>
                        <AlertDialogDescription asChild>
                          <div className="flex flex-col gap-2">
                            <p>
                              Tindakan ini menghapus PERMANEN baris topik ini dari
                              database (site_topics). Konten yang sudah ada{" "}
                              <strong>TIDAK ikut terhapus</strong> - hanya kaitannya
                              ke topik ini yang dilepas.
                            </p>
                            {topic.is_system ? (
                              <p className="font-medium text-destructive">
                                Topik &quot;{topic.label}&quot; adalah bagian bawaan
                                sistem (kunci: {topic.key}). Setelah dihapus, bagian
                                ini hilang dari navigasi publik, Beranda, dan
                                selektor Topik sampai Admin membuat topik baru
                                dengan nama yang sama untuk menyambungnya kembali.
                              </p>
                            ) : null}
                            {count > 0 ? (
                              <p className="font-medium text-destructive">
                                Topik &quot;{topic.label}&quot; masih memiliki{" "}
                                {count} konten. Konten tersebut TIDAK terhapus,
                                tapi akan kehilangan topiknya (tidak lagi tampil di
                                navigasi publik, Beranda, atau sebagai sumber
                                Featured) sampai ditandai ulang ke topik lain.
                              </p>
                            ) : null}
                            <p>Tindakan ini tidak dapat dibatalkan.</p>
                          </div>
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Batal</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleDelete(topic)}>
                          Hapus Permanen
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
