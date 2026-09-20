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
import { slugify } from "@/lib/slugify";
import { newsSchema, type NewsInput } from "@/lib/validators/news";

type Editing = {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  content: string;
  category: string | null;
  author_name: string | null;
  thumbnail_url: string | null;
  is_featured: boolean;
  status: string;
};

export function NewsFormDialog({
  editing,
  trigger,
}: {
  editing?: Editing;
  trigger: ReactNode;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(
    editing?.thumbnail_url ?? null,
  );

  const form = useForm<NewsInput>({
    resolver: zodResolver(newsSchema),
    defaultValues: {
      title: editing?.title ?? "",
      excerpt: editing?.excerpt ?? "",
      content: editing?.content ?? "",
      category: editing?.category ?? "",
      author_name: editing?.author_name ?? "",
      is_featured: editing?.is_featured ?? false,
      status: (editing?.status as "draft" | "published") ?? "draft",
    },
  });

  async function onSubmit(values: NewsInput) {
    setIsSubmitting(true);
    const supabase = createClient();

    const payload = {
      title: values.title,
      excerpt: values.excerpt || null,
      content: values.content,
      category: values.category || null,
      author_name: values.author_name || null,
      thumbnail_url: thumbnailUrl,
      is_featured: values.is_featured,
      status: values.status,
      published_at:
        values.status === "published"
          ? (editing && editing.status === "published" ? undefined : new Date().toISOString())
          : null,
    };

    if (editing) {
      const { error } = await supabase.from("news").update(payload).eq("id", editing.id);
      setIsSubmitting(false);
      if (error) {
        toast.error("Gagal menyimpan", { description: error.message });
        return;
      }
      toast.success("Berita berhasil diperbarui");
      setOpen(false);
      router.refresh();
      return;
    }

    // Berita baru: buat slug dari judul, retry dengan suffix kalau bentrok.
    const baseSlug = slugify(values.title) || "berita";
    let attempt = 0;
    let lastError: string | null = null;

    while (attempt < 3) {
      const slug = attempt === 0 ? baseSlug : `${baseSlug}-${new Date().getTime().toString(36)}`;
      const { error } = await supabase.from("news").insert({ ...payload, slug });

      if (!error) {
        setIsSubmitting(false);
        toast.success("Berita berhasil ditambahkan");
        setOpen(false);
        form.reset();
        setThumbnailUrl(null);
        router.refresh();
        return;
      }

      if (error.code === "23505") {
        attempt += 1;
        lastError = error.message;
        continue;
      }

      setIsSubmitting(false);
      toast.error("Gagal menambahkan berita", { description: error.message });
      return;
    }

    setIsSubmitting(false);
    toast.error("Gagal menambahkan berita", {
      description: lastError ?? "Slug bentrok, coba ubah judul.",
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editing ? "Edit Berita" : "Tambah Berita"}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
            <div>
              <p className="mb-1 text-sm font-medium">Thumbnail</p>
              <ImageUploadField folder="news" value={thumbnailUrl} onChange={setThumbnailUrl} />
            </div>
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Judul</FormLabel>
                  <FormControl>
                    <Input disabled={isSubmitting} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="excerpt"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Ringkasan</FormLabel>
                  <FormControl>
                    <Textarea rows={2} disabled={isSubmitting} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="content"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Isi Berita</FormLabel>
                  <FormControl>
                    <Textarea rows={8} disabled={isSubmitting} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Kategori</FormLabel>
                    <FormControl>
                      <Input disabled={isSubmitting} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="author_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Penulis</FormLabel>
                    <FormControl>
                      <Input disabled={isSubmitting} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
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
                name="is_featured"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Berita Unggulan</FormLabel>
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
