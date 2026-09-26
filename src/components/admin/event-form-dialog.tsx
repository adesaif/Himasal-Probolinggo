"use client";

import { useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { ImageUploadField } from "@/components/admin/image-upload-field";
import { createClient } from "@/lib/supabase/client";
import { toDatetimeLocalInput } from "@/lib/format-date";
import { eventSchema, type EventInput } from "@/lib/validators/event";

type Editing = {
  id: string;
  title: string;
  description: string | null;
  location: string | null;
  start_at: string;
  end_at: string | null;
  is_mandatory: boolean;
  is_featured: boolean;
  is_popular: boolean;
  thumbnail_url: string | null;
  status: string;
};

export function EventFormDialog({
  editing,
  featuredAllowed,
  trigger,
}: {
  editing?: Editing;
  featuredAllowed: boolean;
  trigger: ReactNode;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(
    editing?.thumbnail_url ?? null,
  );

  const form = useForm<EventInput>({
    resolver: zodResolver(eventSchema),
    defaultValues: {
      title: editing?.title ?? "",
      description: editing?.description ?? "",
      location: editing?.location ?? "",
      start_at: editing ? toDatetimeLocalInput(editing.start_at) : "",
      end_at: editing?.end_at ? toDatetimeLocalInput(editing.end_at) : "",
      is_mandatory: editing?.is_mandatory ?? false,
      is_featured: editing?.is_featured ?? false,
      is_popular: editing?.is_popular ?? false,
      status: (editing?.status as "draft" | "published") ?? "draft",
    },
  });

  async function onSubmit(values: EventInput) {
    setIsSubmitting(true);
    const supabase = createClient();

    const payload = {
      title: values.title,
      description: values.description || null,
      location: values.location || null,
      start_at: new Date(values.start_at).toISOString(),
      end_at: values.end_at ? new Date(values.end_at).toISOString() : null,
      is_mandatory: values.is_mandatory,
      is_featured: featuredAllowed ? values.is_featured : false,
      is_popular: values.is_popular,
      thumbnail_url: thumbnailUrl,
      status: values.status,
    };

    const { error } = editing
      ? await supabase.from("events").update(payload).eq("id", editing.id)
      : await supabase.from("events").insert(payload);

    setIsSubmitting(false);

    if (error) {
      toast.error("Gagal menyimpan agenda", { description: error.message });
      return;
    }

    toast.success(editing ? "Agenda berhasil diperbarui" : "Agenda berhasil ditambahkan");
    setOpen(false);
    if (!editing) form.reset();
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editing ? "Edit Agenda" : "Tambah Agenda"}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
            <div>
              <p className="mb-1 text-sm font-medium">Foto (opsional)</p>
              <ImageUploadField folder="events" value={thumbnailUrl} onChange={setThumbnailUrl} />
            </div>
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Judul Kegiatan</FormLabel>
                  <FormControl>
                    <Input disabled={isSubmitting} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="start_at"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Mulai</FormLabel>
                    <FormControl>
                      <Input type="datetime-local" disabled={isSubmitting} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="end_at"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Selesai (opsional)</FormLabel>
                    <FormControl>
                      <Input type="datetime-local" disabled={isSubmitting} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="location"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Lokasi</FormLabel>
                  <FormControl>
                    <Input disabled={isSubmitting} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Deskripsi</FormLabel>
                  <FormControl>
                    <Textarea rows={5} disabled={isSubmitting} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select
                      disabled={isSubmitting}
                      value={field.value}
                      onValueChange={field.onChange}
                    >
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="draft">Draft</SelectItem>
                        <SelectItem value="published">Published</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="is_mandatory"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Wajib Hadir</FormLabel>
                    <FormControl>
                      <div className="flex h-9 items-center">
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          disabled={isSubmitting}
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="is_featured"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Agenda Unggulan</FormLabel>
                  <FormControl>
                    <div className="flex flex-col gap-1">
                      <div className="flex h-9 items-center">
                        <Switch
                          checked={featuredAllowed && field.value}
                          onCheckedChange={field.onChange}
                          disabled={isSubmitting || !featuredAllowed}
                        />
                      </div>
                      {!featuredAllowed ? (
                        <p className="text-xs text-muted-foreground">
                          Topik Agenda belum mengizinkan Unggulan. Aktifkan
                          dulu di Admin → Konten → Topik & Navigasi.
                        </p>
                      ) : null}
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="is_popular"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Populer</FormLabel>
                  <FormControl>
                    <div className="flex h-9 items-center">
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        disabled={isSubmitting}
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Menyimpan..." : "Simpan"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
