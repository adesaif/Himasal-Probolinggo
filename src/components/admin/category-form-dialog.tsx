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
import { createClient } from "@/lib/supabase/client";
import { slugify } from "@/lib/slugify";
import { categorySchema, type CategoryInput } from "@/lib/validators/content";

type Editing = {
  id: string;
  name: string;
  tagline: string | null;
  display_order: number;
};

export function CategoryFormDialog({
  editing,
  trigger,
}: {
  editing?: Editing;
  trigger: ReactNode;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<CategoryInput>({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      name: editing?.name ?? "",
      tagline: editing?.tagline ?? "",
      display_order: editing?.display_order?.toString() ?? "0",
    },
  });

  async function onSubmit(values: CategoryInput) {
    setIsSubmitting(true);
    const supabase = createClient();

    const payload = {
      name: values.name,
      tagline: values.tagline || null,
      display_order: values.display_order ? Number(values.display_order) : 0,
    };

    if (editing) {
      const { error } = await supabase.from("categories").update(payload).eq("id", editing.id);
      setIsSubmitting(false);
      if (error) {
        toast.error("Gagal menyimpan", { description: error.message });
        return;
      }
      toast.success("Kategori berhasil diperbarui");
      setOpen(false);
      router.refresh();
      return;
    }

    // Kategori baru: buat slug dari nama, retry dengan suffix kalau bentrok.
    const baseSlug = slugify(values.name) || "kategori";
    let attempt = 0;
    let lastError: string | null = null;

    while (attempt < 3) {
      const slug = attempt === 0 ? baseSlug : `${baseSlug}-${new Date().getTime().toString(36)}`;
      const { error } = await supabase.from("categories").insert({ ...payload, slug });

      if (!error) {
        setIsSubmitting(false);
        toast.success("Kategori berhasil ditambahkan");
        setOpen(false);
        form.reset();
        router.refresh();
        return;
      }

      if (error.code === "23505") {
        attempt += 1;
        lastError = error.message;
        continue;
      }

      setIsSubmitting(false);
      toast.error("Gagal menambahkan kategori", { description: error.message });
      return;
    }

    setIsSubmitting(false);
    toast.error("Gagal menambahkan kategori", {
      description: lastError ?? "Slug bentrok, coba ubah nama.",
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editing ? "Edit Kategori" : "Tambah Kategori"}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nama Kategori</FormLabel>
                  <FormControl>
                    <Input disabled={isSubmitting} placeholder="Mis. Pendidikan" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="tagline"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tagline</FormLabel>
                  <FormControl>
                    <Input
                      disabled={isSubmitting}
                      placeholder="Kalimat singkat penjelas kategori"
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
