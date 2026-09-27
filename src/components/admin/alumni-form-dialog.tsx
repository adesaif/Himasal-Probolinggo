"use client";

import { useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { AlumniSearchableSelect } from "@/components/admin/alumni-searchable-select";
import { AlumniYearPicker } from "@/components/admin/alumni-year-picker";
import { createClient } from "@/lib/supabase/client";
import type { Kecamatan } from "@/lib/alumni-lokasi";
import {
  alumniFormSchema,
  EMPTY_ALUMNI_FORM,
  type AlumniFormValues,
} from "@/lib/validators/alumni";

/**
 * Form Tambah & Edit Alumni (satu komponen, dua mode) - field: Nama
 * Lengkap, Alamat (Kecamatan -> Desa/Kelurahan), Nomor HP, Tempat Lahir,
 * Tanggal Lahir, Angkatan. Tidak ada email/wilayah/status: status dihitung
 * otomatis dari absensi (lihat alumni_is_aktif di database).
 */
export function AlumniFormDialog({
  alumniId,
  initialValues,
  lokasi,
  trigger,
  onSaved,
}: {
  /** Kosong = mode Tambah. */
  alumniId?: string;
  initialValues?: AlumniFormValues;
  lokasi: Kecamatan[];
  trigger: ReactNode;
  onSaved?: () => void;
}) {
  const router = useRouter();
  const isEdit = Boolean(alumniId);
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<AlumniFormValues>({
    resolver: zodResolver(alumniFormSchema),
    defaultValues: initialValues ?? EMPTY_ALUMNI_FORM,
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

  function handleOpenChange(next: boolean) {
    setOpen(next);
    // Setiap kali dibuka, mulai dari data tersimpan terbaru (Edit) atau
    // form kosong (Tambah) - bukan sisa ketikan yang dibatalkan.
    if (next) form.reset(initialValues ?? EMPTY_ALUMNI_FORM);
  }

  async function onSubmit(values: AlumniFormValues) {
    setIsSubmitting(true);
    const supabase = createClient();

    const { error } = await supabase.rpc("admin_save_alumni", {
      p_alumni_id: alumniId,
      p_nama_lengkap: values.full_name,
      p_no_hp: values.phone || undefined,
      p_tempat_lahir: values.tempat_lahir || undefined,
      p_tanggal_lahir: values.tanggal_lahir || undefined,
      p_kecamatan_id: values.kecamatan_id ?? undefined,
      p_desa_kelurahan_id: values.desa_kelurahan_id ?? undefined,
      p_angkatan: values.angkatan ?? undefined,
    });

    setIsSubmitting(false);

    if (error) {
      toast.error(isEdit ? "Gagal menyimpan perubahan" : "Gagal menambahkan alumni", {
        description: error.message,
      });
      return;
    }

    toast.success(isEdit ? "Data alumni berhasil diperbarui" : "Alumni berhasil ditambahkan");
    setOpen(false);
    onSaved?.();
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Data Alumni" : "Tambah Alumni"}</DialogTitle>
          <DialogDescription>
            Status Aktif/Nonaktif ditentukan otomatis dari riwayat kehadiran agenda.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="flex min-w-0 flex-col gap-4"
            noValidate
          >
            <FormField
              control={form.control}
              name="full_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nama Lengkap</FormLabel>
                  <FormControl>
                    <Input autoComplete="off" disabled={isSubmitting} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <fieldset className="flex min-w-0 flex-col gap-2">
              <legend className="mb-2 text-sm leading-none font-medium">Alamat</legend>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="kecamatan_id"
                  render={({ field }) => (
                    <FormItem className="min-w-0">
                      <FormLabel className="text-xs text-muted-foreground">Kecamatan</FormLabel>
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
                      <FormLabel className="text-xs text-muted-foreground">
                        Desa/Kelurahan
                      </FormLabel>
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
            </fieldset>

            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nomor HP</FormLabel>
                  <FormControl>
                    <Input type="tel" inputMode="tel" disabled={isSubmitting} {...field} />
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

            <FormField
              control={form.control}
              name="angkatan"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Angkatan</FormLabel>
                  <FormControl>
                    <AlumniYearPicker
                      value={field.value}
                      onChange={field.onChange}
                      disabled={isSubmitting}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Menyimpan..." : isEdit ? "Simpan Perubahan" : "Tambah Alumni"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
