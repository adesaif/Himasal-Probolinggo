"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { AlumniSearchableSelect } from "@/components/admin/alumni-searchable-select";
import { createClient } from "@/lib/supabase/client";
import type { Kecamatan } from "@/lib/alumni-lokasi";
import { profileFormSchema, type ProfileFormInput } from "@/lib/validators/profile";

/**
 * Form Profil Saya. Satu jalur tulis: alumni_save_own_profile menyimpan ke
 * master alumni (nama_lengkap, no_hp, lokasi, dst.) dan menyamakan nama/HP
 * akun - jadi Beranda, Admin, dan Monitoring selalu membaca data yang sama.
 */
export function ProfileForm({
  initialValues,
  lokasi,
}: {
  initialValues: ProfileFormInput;
  lokasi: Kecamatan[];
}) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<ProfileFormInput>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: initialValues,
  });
  const kecamatanId = useWatch({ control: form.control, name: "kecamatan_id" });

  const kecamatanOptions = useMemo(
    () => lokasi.map((k) => ({ value: k.id, label: k.nama })),
    [lokasi],
  );
  const desaOptions = useMemo(() => {
    const kec = lokasi.find((k) => k.id === kecamatanId);
    return (kec?.desaKelurahan ?? []).map((d) => ({
      value: d.id,
      label: d.nama,
      group: d.jenis === "kelurahan" ? "Kelurahan" : "Desa",
    }));
  }, [lokasi, kecamatanId]);

  async function onSubmit(values: ProfileFormInput) {
    setIsSubmitting(true);
    const supabase = createClient();
    const { error } = await supabase.rpc("alumni_save_own_profile", {
      p_nama_lengkap: values.full_name,
      p_no_hp: values.phone || undefined,
      p_tempat_lahir: values.tempat_lahir || undefined,
      p_tanggal_lahir: values.tanggal_lahir || undefined,
      p_alamat: values.alamat || undefined,
      p_kecamatan_id: values.kecamatan_id ?? undefined,
      p_desa_kelurahan_id: values.desa_kelurahan_id ?? undefined,
    });
    setIsSubmitting(false);

    if (error) {
      toast.error("Gagal menyimpan profil", { description: error.message });
      return;
    }

    toast.success("Profil berhasil disimpan");
    form.reset(values);
    router.refresh();
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
        <Card>
          <CardContent className="flex flex-col gap-4">
            <h2 className="font-semibold tracking-tight">Data Diri</h2>
            <FormField
              control={form.control}
              name="full_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nama Lengkap</FormLabel>
                  <FormControl>
                    <Input autoComplete="name" disabled={isSubmitting} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nomor HP</FormLabel>
                  <FormControl>
                    <Input
                      type="tel"
                      inputMode="tel"
                      autoComplete="tel"
                      placeholder="08xxxxxxxxxx"
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
                name="tempat_lahir"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tempat Lahir</FormLabel>
                    <FormControl>
                      <Input disabled={isSubmitting} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="tanggal_lahir"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tanggal Lahir</FormLabel>
                    <FormControl>
                      <Input type="date" disabled={isSubmitting} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex flex-col gap-4">
            <h2 className="font-semibold tracking-tight">Alamat</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="kecamatan_id"
                render={({ field }) => (
                  <FormItem className="min-w-0">
                    <FormLabel>Kecamatan</FormLabel>
                    <FormControl>
                      <AlumniSearchableSelect
                        value={field.value}
                        onChange={(next) => {
                          field.onChange(next);
                          // Desa lama hampir pasti bukan milik kecamatan
                          // baru - reset kalau memang tidak termasuk.
                          const desaId = form.getValues("desa_kelurahan_id");
                          const kec = lokasi.find((k) => k.id === next);
                          if (desaId && !kec?.desaKelurahan.some((d) => d.id === desaId)) {
                            form.setValue("desa_kelurahan_id", null, { shouldDirty: true });
                          }
                        }}
                        options={kecamatanOptions}
                        placeholder="Pilih kecamatan"
                        searchPlaceholder="Cari kecamatan..."
                        emptyText="Kecamatan tidak ditemukan."
                        disabled={isSubmitting}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="desa_kelurahan_id"
                render={({ field }) => (
                  <FormItem className="min-w-0">
                    <FormLabel>Desa/Kelurahan</FormLabel>
                    <FormControl>
                      <AlumniSearchableSelect
                        value={field.value}
                        onChange={field.onChange}
                        options={desaOptions}
                        placeholder={kecamatanId ? "Pilih desa/kelurahan" : "Pilih kecamatan dulu"}
                        searchPlaceholder="Cari desa/kelurahan..."
                        emptyText="Desa/kelurahan tidak ditemukan."
                        disabled={isSubmitting || !kecamatanId}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="alamat"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Detail Alamat</FormLabel>
                  <FormControl>
                    <Textarea
                      rows={3}
                      placeholder="Nama jalan, dusun, RT/RW"
                      autoComplete="street-address"
                      disabled={isSubmitting}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button type="submit" disabled={isSubmitting} className="w-full sm:w-auto">
            {isSubmitting ? "Menyimpan..." : "Simpan Profil"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
