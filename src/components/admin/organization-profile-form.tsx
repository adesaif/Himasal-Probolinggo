"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { createClient } from "@/lib/supabase/client";
import {
  organizationProfileSchema,
  type OrganizationProfileInput,
} from "@/lib/validators/content";

export function OrganizationProfileForm({
  id,
  initialValues,
}: {
  id: string;
  initialValues: OrganizationProfileInput;
}) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

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
        <div className="flex justify-end">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Menyimpan..." : "Simpan Perubahan"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
