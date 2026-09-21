"use client";

import { useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { galleryItemSchema, type GalleryItemInput } from "@/lib/validators/gallery";

type Editing = {
  id: string;
  image_url: string;
  caption: string | null;
  display_order: number;
  is_published: boolean;
  is_featured: boolean;
};

export function GalleryFormDialog({
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
  const [imageUrl, setImageUrl] = useState<string | null>(editing?.image_url ?? null);

  const form = useForm<GalleryItemInput>({
    resolver: zodResolver(galleryItemSchema),
    defaultValues: {
      caption: editing?.caption ?? "",
      display_order: editing?.display_order?.toString() ?? "0",
      is_published: editing?.is_published ?? true,
      is_featured: editing?.is_featured ?? false,
    },
  });

  async function onSubmit(values: GalleryItemInput) {
    if (!imageUrl) {
      toast.error("Foto wajib diunggah");
      return;
    }

    setIsSubmitting(true);
    const supabase = createClient();
    const payload = {
      image_url: imageUrl,
      caption: values.caption || null,
      display_order: values.display_order ? Number(values.display_order) : 0,
      is_published: values.is_published,
      is_featured: featuredAllowed ? values.is_featured : false,
    };

    const { error } = editing
      ? await supabase.from("gallery_items").update(payload).eq("id", editing.id)
      : await supabase.from("gallery_items").insert(payload);

    setIsSubmitting(false);

    if (error) {
      toast.error("Gagal menyimpan", { description: error.message });
      return;
    }

    toast.success(editing ? "Foto berhasil diperbarui" : "Foto berhasil ditambahkan");
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
          <DialogTitle>{editing ? "Edit Foto" : "Tambah Foto"}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
            <div>
              <p className="mb-1 text-sm font-medium">Foto</p>
              <ImageUploadField folder="gallery" value={imageUrl} onChange={setImageUrl} />
            </div>
            <FormField
              control={form.control}
              name="caption"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Caption</FormLabel>
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
                name="is_published"
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
                          : "Topik Galeri belum mengizinkan Unggulan"}
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
