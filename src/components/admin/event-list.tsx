"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
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
import { EventFormDialog } from "@/components/admin/event-form-dialog";
import { createClient } from "@/lib/supabase/client";
import { formatEventRange } from "@/lib/format-date";

type EventRow = {
  id: string;
  title: string;
  description: string | null;
  location: string | null;
  start_at: string;
  end_at: string | null;
  is_mandatory: boolean;
  is_featured: boolean;
  thumbnail_url: string | null;
  status: string;
};

export function EventList({ featuredAllowed }: { featuredAllowed: boolean }) {
  const [rows, setRows] = useState<EventRow[]>([]);
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
        .from("events")
        .select(
          "id, title, description, location, start_at, end_at, is_mandatory, is_featured, thumbnail_url, status",
        )
        .order("start_at", { ascending: false });

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

  async function handleDelete(id: string) {
    setBusyId(id);
    const supabase = createClient();
    const { error } = await supabase.from("events").delete().eq("id", id);
    setBusyId(null);

    if (error) {
      toast.error("Gagal menghapus agenda", { description: error.message });
      return;
    }
    toast.success("Agenda berhasil dihapus");
    setReloadKey((k) => k + 1);
  }

  async function toggleStatus(row: EventRow) {
    setBusyId(row.id);
    const nextStatus = row.status === "published" ? "draft" : "published";
    const supabase = createClient();
    const { error } = await supabase
      .from("events")
      .update({ status: nextStatus })
      .eq("id", row.id);
    setBusyId(null);

    if (error) {
      toast.error("Gagal mengubah status", { description: error.message });
      return;
    }
    toast.success(nextStatus === "published" ? "Agenda dipublikasikan" : "Agenda dijadikan draft");
    setReloadKey((k) => k + 1);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Agenda</h1>
        <EventFormDialog
          featuredAllowed={featuredAllowed}
          trigger={
            <Button>
              <Plus />
              Tambah Agenda
            </Button>
          }
        />
      </div>

      {isLoading ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
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
            Belum ada agenda. Klik &quot;Tambah Agenda&quot; untuk membuat yang pertama.
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-2">
          {rows.map((row) => (
            <Card key={row.id}>
              <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={
                        row.status === "published"
                          ? "rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800 dark:bg-green-900/40 dark:text-green-300"
                          : "rounded-full bg-neutral-100 px-2.5 py-0.5 text-xs font-medium text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300"
                      }
                    >
                      {row.status === "published" ? "Published" : "Draft"}
                    </span>
                    {row.is_mandatory ? (
                      <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
                        Wajib Hadir
                      </span>
                    ) : null}
                    {row.is_featured ? (
                      <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                        Unggulan
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-1 truncate font-medium">{row.title}</p>
                  <p className="text-sm text-muted-foreground">
                    {formatEventRange(row.start_at, row.end_at)}
                    {row.location ? ` · ${row.location}` : ""}
                  </p>
                </div>
                <div className="flex shrink-0 flex-wrap gap-2">
                  {row.status === "published" ? (
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/admin/absensi/${row.id}`}>Absensi</Link>
                    </Button>
                  ) : null}
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={busyId === row.id}
                    onClick={() => toggleStatus(row)}
                  >
                    {row.status === "published" ? "Jadikan Draft" : "Publikasikan"}
                  </Button>
                  <EventFormDialog
                    editing={row}
                    featuredAllowed={featuredAllowed}
                    trigger={
                      <Button variant="outline" size="sm" disabled={busyId === row.id}>
                        <Pencil />
                        Edit
                      </Button>
                    }
                  />
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" size="sm" disabled={busyId === row.id}>
                        <Trash2 />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Hapus agenda ini?</AlertDialogTitle>
                        <AlertDialogDescription>
                          &quot;{row.title}&quot; akan dihapus permanen dan tidak bisa
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
