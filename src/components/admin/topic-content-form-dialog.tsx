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
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { ImageUploadField } from "@/components/admin/image-upload-field";
import { createClient } from "@/lib/supabase/client";
import { topicContentSchema, type TopicContentInput } from "@/lib/validators/content";

type Editing = {
  id: string;
  title: string;
  description: string | null;
  image_url: string | null;
  link_url: string | null;
  display_order: number;
  is_active: boolean;
  is_featured: boolean;
};

export function TopicContentFormDialog({
  topicId,
  editing,
  featuredAllowed,
  trigger,
}: {
  topicId: string;
  editing?: Editing;
  featuredAllowed: boolean;
  trigger: ReactNode;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(editing?.image_url ?? null);

  const form = useForm<TopicContentInput>({
    resolver: zodResolver(topicContentSchema),
    defaultValues: {
      title: editing?.title ?? "",
      description: editing?.description ?? "",
      link_url: editing?.link_url ?? "",
      display_order: editing?.display_order?.toString() ?? "0",
      is_active: editing?.is_active ?? true,
      is_featured: editing?.is_featured ?? false,
    },
  });

  async function onSubmit(values: TopicContentInput) {
    setIsSubmitting(true);
    const supabase = createClient();
    const payload = {
      topic_id: topicId,
      title: values.title,
      description: values.description || null,
      image_url: imageUrl,
      link_url: values.link_url || null,
      display_order: values.display_order ? Number(values.display_order) : 0,
      is_active: values.is_active,
      is_featured: featuredAllowed ? values.is_featured : false,
    };

    const { error } = editing
      ? await supabase.from("topic_content").update(payload).eq("id", editing.id)
      : await supabase.from("topic_content").insert(payload);

    setIsSubmitting(false);

    if (error) {
      toast.error("Gagal menyimpan", { description: error.message });
      return;
    }

    toast.success(editing ? "Konten berhasil diperbarui" : "Konten berhasil ditambahkan");
    setOpen(false);
    if (!editing) {
      form.reset();
      setImageUrl(null);
    }
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editing ? "Edit Konten" : "Tambah Konten"}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
            <div>
              <p className="mb-1 text-sm font-medium">Gambar (opsional)</p>
              <ImageUploadField folder="topik" value={imageUrl} onChange={setImageUrl} />
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
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Deskripsi (opsional)</FormLabel>
                  <FormControl>
                    <Textarea rows={3} disabled={isSubmitting} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="link_url"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tautan (opsional)</FormLabel>
                  <FormControl>
                    <Input
                      type="url"
                      placeholder="https://..."
                      disabled={isSubmitting}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="display_order"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Urutan Tampil</FormLabel>
                    <FormControl>
                      <Input type="number" inputMode="numeric" disabled={isSubmitting} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="is_active"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tampilkan di Publik</FormLabel>
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
                  <FormLabel>Unggulan</FormLabel>
                  <FormControl>
                    <div className="flex h-9 items-center gap-2">
                      <Switch
                        checked={featuredAllowed && field.value}
                        onCheckedChange={field.onChange}
                        disabled={isSubmitting || !featuredAllowed}
                      />
                      <span className="text-sm text-muted-foreground">
                        {featuredAllowed
                          ? "Tampilkan di Hero Carousel"
                          : "Topik ini belum mengizinkan Unggulan"}
                      </span>
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
