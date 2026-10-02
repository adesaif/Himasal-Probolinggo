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
import { createClient } from "@/lib/supabase/client";
import { slugify } from "@/lib/slugify";
import { topicCreateSchema, type TopicCreateInput } from "@/lib/validators/content";

export function TopicCreateDialog({ trigger }: { trigger: ReactNode }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<TopicCreateInput>({
    resolver: zodResolver(topicCreateSchema),
    defaultValues: {
      label: "",
      description: "",
      display_order: "0",
      is_active: true,
      allow_featured: false,
    },
  });

  async function onSubmit(values: TopicCreateInput) {
    setIsSubmitting(true);
    const supabase = createClient();

    const displayOrder = values.display_order ? Number(values.display_order) : 0;
    const basePayload = {
      label: values.label,
      description: values.description || null,
      display_order: displayOrder,
      is_active: values.is_active,
      allow_featured: values.allow_featured,
      // Topik custom selalu "sistem palsu = false" - dibackup tabel
      // generik topic_content, bukan tabel khusus. supports_featured=true
      // supaya toggle Unggulan langsung berfungsi nyata sejak dibuat
      // (bukan "Belum tersedia").
      is_system: false,
      supports_featured: true,
      // default_* mencerminkan nilai saat dibuat, supaya "Reset ke
      // Default" tetap berfungsi untuk topik custom.
      default_label: values.label,
      default_description: values.description || null,
      default_display_order: displayOrder,
      default_is_active: values.is_active,
      default_allow_featured: values.allow_featured,
    };

    // key harus unik & immutable - dibuat dari nama, retry dengan suffix
    // kalau bentrok (mengikuti pola slug kategori/berita).
    const baseSlug = slugify(values.label) || "topik";
    let attempt = 0;
    let lastError: string | null = null;

    while (attempt < 3) {
      const key = attempt === 0 ? baseSlug : `${baseSlug}-${new Date().getTime().toString(36)}`;
      const { error } = await supabase.from("site_topics").insert({ ...basePayload, key });

      if (!error) {
        setIsSubmitting(false);
        toast.success("Topik berhasil ditambahkan");
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
      toast.error("Gagal menambahkan topik", { description: error.message });
      return;
    }

    setIsSubmitting(false);
    toast.error("Gagal menambahkan topik", {
      description: lastError ?? "Nama topik bentrok, coba ubah nama.",
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Tambah Topik</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
            <FormField
              control={form.control}
              name="label"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nama Topik</FormLabel>
                  <FormControl>
                    <Input disabled={isSubmitting} placeholder="Mis. Kegiatan Alumni" {...field} />
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
                    <Textarea rows={2} disabled={isSubmitting} {...field} />
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
                    <FormLabel>Aktif</FormLabel>
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
              name="allow_featured"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Izinkan Unggulan / Featured</FormLabel>
                  <FormControl>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        disabled={isSubmitting}
                      />
                      <span className="text-sm text-muted-foreground">
                        {field.value
                          ? "Konten topik ini boleh ditandai Featured dan masuk Hero Carousel"
                          : "Konten topik ini tidak bisa masuk Hero Carousel"}
                      </span>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <p className="text-xs text-muted-foreground">
              Setelah dibuat, topik ini otomatis muncul di navigasi publik dan
              mendapat section sendiri di Beranda begitu ada kontennya. Kelola
              kontennya lewat tombol &quot;Kelola Konten&quot; di daftar topik.
            </p>
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
