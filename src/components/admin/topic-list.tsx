"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { ArrowDown, ArrowUp, Pencil, RotateCcw } from "lucide-react";

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
import { TopicFormDialog } from "@/components/admin/topic-form-dialog";
import { createClient } from "@/lib/supabase/client";
import type { SiteTopic } from "@/lib/topics";

export function TopicList({ rows }: { rows: SiteTopic[] }) {
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
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Topik & Navigasi</h1>
        <p className="text-sm text-muted-foreground">
          Kelola nama, deskripsi, urutan, status aktif, dan izin Unggulan
          untuk setiap topik/bagian website. Mengganti nama di sini otomatis
          tercermin di menu navigasi publik dan sidebar Admin. Topik ini
          adalah bagian tetap dari sistem — tidak bisa ditambah atau dihapus
          permanen, hanya diubah pengaturannya atau dikembalikan ke default.
        </p>
      </div>

      <div className="flex flex-col gap-2">
        {rows.map((topic, index) => (
          <Card key={topic.id}>
            <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium">{topic.label}</p>
                  <span
                    className={
                      topic.is_active
                        ? "rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800 dark:bg-green-900/40 dark:text-green-300"
                        : "rounded-full bg-neutral-100 px-2.5 py-0.5 text-xs font-medium text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300"
                    }
                  >
                    {topic.is_active ? "Aktif" : "Nonaktif"}
                  </span>
                  {topic.supports_featured ? (
                    <span
                      className={
                        topic.allow_featured
                          ? "rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary"
                          : "rounded-full bg-neutral-100 px-2.5 py-0.5 text-xs font-medium text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300"
                      }
                    >
                      Unggulan {topic.allow_featured ? "ON" : "OFF"}
                    </span>
                  ) : (
                    <span className="rounded-full bg-neutral-100 px-2.5 py-0.5 text-xs font-medium text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400">
                      Unggulan: Belum tersedia
                    </span>
                  )}
                </div>
                {topic.description ? (
                  <p className="mt-1 line-clamp-1 text-sm text-muted-foreground">
                    {topic.description}
                  </p>
                ) : null}
                <p className="text-xs text-muted-foreground">
                  Kunci sistem: {topic.key} · Urutan: {topic.display_order}
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
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
