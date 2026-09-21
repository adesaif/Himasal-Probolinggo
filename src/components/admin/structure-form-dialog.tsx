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
import { structureSchema, type StructureInput } from "@/lib/validators/content";

type Editing = {
  id: string;
  nama: string;
  jabatan: string;
  foto_url: string | null;
  display_order: number;
  is_featured: boolean;
};

export function StructureFormDialog({
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

  const form = useForm<StructureInput>({
    resolver: zodResolver(structureSchema),
    defaultValues: {
      nama: editing?.nama ?? "",
      jabatan: editing?.jabatan ?? "",
      display_order: editing?.display_order?.toString() ?? "0",
    },
  });

  async function onSubmit(values: StructureInput) {
    setIsSubmitting(true);
    const supabase = createClient();
    const payload = {
      nama: values.nama,
      jabatan: values.jabatan,
      display_order: values.display_order ? Number(values.display_order) : 0,
      foto_url: fotoUrl,
      is_featured: featuredAllowed ? isFeatured : false,
    };

    const { error } = editing
      ? await supabase.from("organization_structure").update(payload).eq("id", editing.id)
      : await supabase.from("organization_structure").insert(payload);

    setIsSubmitting(false);

    if (error) {
      toast.error("Gagal menyimpan", { description: error.message });
      return;
    }

    toast.success(editing ? "Data berhasil diperbarui" : "Pengurus berhasil ditambahkan");
    setOpen(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editing ? "Edit Pengurus" : "Tambah Pengurus"}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
            <ImageUploadField folder="structure" value={fotoUrl} onChange={setFotoUrl} />
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
              name="jabatan"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Jabatan</FormLabel>
                  <FormControl>
                    <Input disabled={isSubmitting} {...field} />
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
              <div className="flex flex-col gap-1">
                <div className="flex h-9 items-center gap-2">
                  <Switch
                    checked={featuredAllowed && isFeatured}
                    onCheckedChange={setIsFeatured}
                    disabled={isSubmitting || !featuredAllowed}
                  />
                  <span className="text-sm text-muted-foreground">
                    {featuredAllowed ? "Tampilkan di Hero Carousel" : "Topik Struktur belum mengizinkan Unggulan"}
                  </span>
                </div>
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
