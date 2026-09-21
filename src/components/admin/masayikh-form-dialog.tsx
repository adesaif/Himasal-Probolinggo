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
import { masayikhSchema, type MasayikhInput } from "@/lib/validators/content";

type Editing = {
  id: string;
  nama: string;
  deskripsi: string | null;
  foto_url: string | null;
  display_order: number;
  is_featured: boolean;
};

export function MasayikhFormDialog({
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
  const [fotoUrl, setFotoUrl] = useState<string | null>(editing?.foto_url ?? null);
  const [isFeatured, setIsFeatured] = useState(editing?.is_featured ?? false);

  const form = useForm<MasayikhInput>({
    resolver: zodResolver(masayikhSchema),
    defaultValues: {
      nama: editing?.nama ?? "",
      deskripsi: editing?.deskripsi ?? "",
      display_order: editing?.display_order?.toString() ?? "0",
    },
  });

  async function onSubmit(values: MasayikhInput) {
    setIsSubmitting(true);
    const supabase = createClient();
    const payload = {
      nama: values.nama,
      deskripsi: values.deskripsi || null,
      display_order: values.display_order ? Number(values.display_order) : 0,
      foto_url: fotoUrl,
      is_featured: featuredAllowed ? isFeatured : false,
    };

    const { error } = editing
      ? await supabase.from("masayikh").update(payload).eq("id", editing.id)
      : await supabase.from("masayikh").insert(payload);

    setIsSubmitting(false);

    if (error) {
      toast.error("Gagal menyimpan", { description: error.message });
      return;
    }

    toast.success(editing ? "Data berhasil diperbarui" : "Masayikh berhasil ditambahkan");
    setOpen(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editing ? "Edit Masayikh" : "Tambah Masayikh"}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
            <ImageUploadField folder="masayikh" value={fotoUrl} onChange={setFotoUrl} />
            <FormField
              control={form.control}
              name="nama"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nama</FormLabel>
                  <FormControl>
                    <Input disabled={isSubmitting} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="deskripsi"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Deskripsi Singkat</FormLabel>
                  <FormControl>
                    <Textarea rows={3} disabled={isSubmitting} {...field} />
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
            <div>
              <p className="mb-1 text-sm font-medium">Unggulan</p>
              <div className="flex h-9 items-center gap-2">
                <Switch
                  checked={featuredAllowed && isFeatured}
                  onCheckedChange={setIsFeatured}
                  disabled={isSubmitting || !featuredAllowed}
                />
                <span className="text-sm text-muted-foreground">
                  {featuredAllowed ? "Tampilkan di Hero Carousel" : "Topik Masayikh belum mengizinkan Unggulan"}
                </span>
              </div>
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
