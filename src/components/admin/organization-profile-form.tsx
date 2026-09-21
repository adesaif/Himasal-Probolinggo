"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
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
import {
  organizationProfileSchema,
  type OrganizationProfileInput,
} from "@/lib/validators/content";

export function OrganizationProfileForm({
  id,
  initialValues,
  initialImageUrl,
  initialIsFeatured,
  featuredAllowed,
}: {
  id: string;
  initialValues: OrganizationProfileInput;
  initialImageUrl: string | null;
  initialIsFeatured: boolean;
  featuredAllowed: boolean;
}) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(initialImageUrl);
  const [isFeatured, setIsFeatured] = useState(initialIsFeatured);

  const form = useForm<OrganizationProfileInput>({
    resolver: zodResolver(organizationProfileSchema),
    defaultValues: initialValues,
  });

  async function onSubmit(values: OrganizationProfileInput) {
    setIsSubmitting(true);
    const supabase = createClient();

    const { error } = await supabase
      .from("organization_profile")
      .update({
        sejarah: values.sejarah || null,
        visi: values.visi || null,
        misi: values.misi || null,
        tujuan: values.tujuan || null,
        deskripsi: values.deskripsi || null,
        image_url: imageUrl,
        is_featured: featuredAllowed ? isFeatured : false,
      })
      .eq("id", id);

    setIsSubmitting(false);

    if (error) {
      toast.error("Gagal menyimpan", { description: error.message });
      return;
    }

    toast.success("Profil organisasi berhasil disimpan");
    router.refresh();
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="flex flex-col gap-4"
        noValidate
      >
        <FormField
          control={form.control}
          name="deskripsi"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Deskripsi Singkat (untuk Beranda)</FormLabel>
              <FormControl>
                <Textarea rows={3} disabled={isSubmitting} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="sejarah"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Sejarah</FormLabel>
              <FormControl>
                <Textarea rows={6} disabled={isSubmitting} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="visi"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Visi</FormLabel>
              <FormControl>
                <Textarea rows={3} disabled={isSubmitting} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="misi"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Misi</FormLabel>
              <FormControl>
                <Textarea rows={4} disabled={isSubmitting} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="tujuan"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Tujuan</FormLabel>
              <FormControl>
                <Textarea rows={4} disabled={isSubmitting} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div>
          <p className="mb-1 text-sm font-medium">Foto Profil (untuk Hero, opsional)</p>
          <ImageUploadField folder="profil" value={imageUrl} onChange={setImageUrl} />
        </div>
        <div>
          <p className="mb-1 text-sm font-medium">Profil Unggulan</p>
          <div className="flex flex-col gap-1">
            <div className="flex h-9 items-center gap-2">
              <Switch
                checked={featuredAllowed && isFeatured}
                onCheckedChange={setIsFeatured}
                disabled={isSubmitting || !featuredAllowed}
              />
              <span className="text-sm text-muted-foreground">
                {featuredAllowed
                  ? "Tampilkan halaman Profil sebagai slide di Hero Carousel (butuh foto di atas)"
                  : "Topik Profil belum mengizinkan Unggulan"}
              </span>
            </div>
            {!featuredAllowed ? (
              <p className="text-xs text-muted-foreground">
                Aktifkan dulu di Admin → Konten → Topik &amp; Navigasi.
              </p>
            ) : null}
          </div>
        </div>
        <div className="flex justify-end">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Menyimpan..." : "Simpan Perubahan"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
