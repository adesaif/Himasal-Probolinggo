"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Plus, Pencil, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
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
import { EventFormDialog } from "@/components/admin/event-form-dialog";
import { createClient } from "@/lib/supabase/client";
import { formatEventRange } from "@/lib/format-date";
import { cleanupStorageFileIfUnused } from "@/lib/storage-cleanup";

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

  async function handleDelete(row: EventRow) {
    setBusyId(row.id);
    const supabase = createClient();

    // Safety check: jangan cascade-delete data absensi/QR nyata secara
    // membabi buta. Kalau agenda ini masih punya rekaman kehadiran, blok
    // delete dan jelaskan ke Admin - jangan silent-cascade lewat FK.
    const { count: attendanceCount } = await supabase
      .from("attendance_records")
      .select("id", { count: "exact", head: true })
      .eq("event_id", row.id);

    if ((attendanceCount ?? 0) > 0) {
      setBusyId(null);
      toast.error("Tidak bisa menghapus permanen", {
        description: `Agenda ini masih punya ${attendanceCount} data absensi tercatat. Hapus/pindahkan data absensi terlebih dahulu sebelum menghapus agenda ini secara permanen.`,
      });
      return;
    }

    const { error } = await supabase.from("events").delete().eq("id", row.id);

    if (error) {
      setBusyId(null);
      toast.error("Gagal menghapus agenda", { description: error.message });
      return;
    }

    await cleanupStorageFileIfUnused(supabase, row.thumbnail_url, async () => {
      const { count } = await supabase
        .from("events")
        .select("id", { count: "exact", head: true })
        .eq("thumbnail_url", row.thumbnail_url as string);
      return (count ?? 0) > 0;
    });

    setBusyId(null);
    toast.success("Agenda berhasil dihapus permanen");
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
      <AdminPageHeader
        title="Agenda"
        actions={
          <EventFormDialog
            featuredAllowed={featuredAllowed}
            trigger={
              <Button>
                <Plus />
                Tambah Agenda
              </Button>
            }
          />
        }
      />

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
                    <Badge variant={row.status === "published" ? "success" : "neutral"}>
                      {row.status === "published" ? "Published" : "Draft"}
                    </Badge>
                    {row.is_mandatory ? <Badge variant="warning">Wajib Hadir</Badge> : null}
                    {row.is_featured ? <Badge variant="primary">Unggulan</Badge> : null}
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
                        Hapus Permanen
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>
                          Hapus permanen &quot;{row.title}&quot;?
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                          Apakah Anda yakin ingin menghapus permanen agenda ini?
                          Tindakan ini tidak dapat dibatalkan - agenda akan
                          hilang dari Admin, halaman publik, dan Hero Carousel
                          (jika sedang Unggulan). Jika agenda ini masih punya
                          data absensi tercatat, penghapusan akan diblok.
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
