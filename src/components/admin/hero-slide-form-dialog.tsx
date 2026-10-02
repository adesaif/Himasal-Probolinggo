"use client";

import { useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { heroSlideSchema, type HeroSlideInput } from "@/lib/validators/content";

type Editing = {
  id: string;
  image_url: string;
  alt_text: string;
  display_order: number;
};

export function HeroSlideFormDialog({
  editing,
  trigger,
}: {
  editing?: Editing;
  trigger: ReactNode;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(editing?.image_url ?? null);

  const form = useForm<HeroSlideInput>({
    resolver: zodResolver(heroSlideSchema),
    defaultValues: {
      alt_text: editing?.alt_text ?? "",
      display_order: editing?.display_order?.toString() ?? "0",
    },
  });

  async function onSubmit(values: HeroSlideInput) {
    if (!imageUrl) {
      toast.error("Wallpaper wajib diunggah");
      return;
    }

    setIsSubmitting(true);
    const supabase = createClient();
    const payload = {
      image_url: imageUrl,
      alt_text: values.alt_text,
      display_order: values.display_order ? Number(values.display_order) : 0,
    };

    const { error } = editing
      ? await supabase.from("hero_slides").update(payload).eq("id", editing.id)
      : await supabase.from("hero_slides").insert(payload);

    setIsSubmitting(false);

    if (error) {
      toast.error("Gagal menyimpan", { description: error.message });
      return;
    }

    toast.success(editing ? "Wallpaper berhasil diperbarui" : "Wallpaper berhasil ditambahkan");
    setOpen(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editing ? "Edit Wallpaper Hero" : "Tambah Wallpaper Hero"}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
            <ImageUploadField folder="hero" value={imageUrl} onChange={setImageUrl} />
            <FormField
              control={form.control}
              name="alt_text"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Alt Text</FormLabel>
                  <FormControl>
                    <Input
                      disabled={isSubmitting}
                      placeholder="Deskripsi singkat foto untuk aksesibilitas"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
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
