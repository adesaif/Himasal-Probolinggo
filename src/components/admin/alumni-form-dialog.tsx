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
import { EmailAutocompleteInput } from "@/components/admin/email-autocomplete-input";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/client";
import type { Kecamatan } from "@/lib/alumni-lokasi";
import {
  ACCOUNT_STATUS_BADGE,
  ACCOUNT_STATUS_LABEL,
  type AlumniAccountInfo,
} from "@/lib/alumni-account-status";
import { normalizeEmail } from "@/lib/email-suggest";
import {
  alumniCreateSchema,
  alumniEditSchema,
  EMPTY_ALUMNI_FORM,
  type AlumniFormValues,
} from "@/lib/validators/alumni";

async function postJson(url: string, body: unknown) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = (await res.json().catch(() => ({}))) as {
    error?: string;
    warning?: string;
    message?: string;
  };
  return { status: res.status, ...json };
}

/**
 * Form Tambah & Edit Alumni (satu komponen, dua mode) - field: Nama
 * Lengkap, Email, Alamat (Kecamatan -> Desa/Kelurahan), Nomor HP, Tempat
 * Lahir, Tanggal Lahir, Angkatan. Tidak ada wilayah/status: status dihitung
 * otomatis dari absensi (lihat alumni_is_aktif di database).
 *
 * Email = akun login alumni. Tambah: wajib; server membuat akun + mengirim
 * undangan (POST /api/admin/alumni). Edit: kalau alumni belum punya akun,
 * email opsional - diisi = buat akun & undang; kalau sudah punya akun,
 * email ditampilkan read-only (status & kirim ulang ada di halaman detail).
 */
export function AlumniFormDialog({
  alumniId,
  initialValues,
  lokasi,
  trigger,
  onSaved,
  account,
}: {
  /** Kosong = mode Tambah. */
  alumniId?: string;
  /** Status akun (mode Edit). */
  account?: AlumniAccountInfo;
  initialValues?: AlumniFormValues;
  lokasi: Kecamatan[];
  trigger: ReactNode;
  onSaved?: () => void;
}) {
  const router = useRouter();
  const isEdit = Boolean(alumniId);
  const hasAccount = Boolean(account && account.status !== "tanpa_akun");
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<AlumniFormValues>({
    resolver: zodResolver(isEdit ? alumniEditSchema : alumniCreateSchema),
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
    try {
      if (!isEdit) {
        // Tambah: data alumni + akun + undangan dibuat server-side.
        const res = await postJson("/api/admin/alumni", {
          full_name: values.full_name,
          email: normalizeEmail(values.email),
          kecamatan_id: values.kecamatan_id,
          desa_kelurahan_id: values.desa_kelurahan_id,
          phone: values.phone,
          tempat_lahir: values.tempat_lahir,
          tanggal_lahir: values.tanggal_lahir,
          angkatan: values.angkatan,
        });
        if (res.status === 201) {
          toast.success("Alumni berhasil ditambahkan", { description: res.message });
        } else if (res.status === 207) {
          toast.warning("Alumni tersimpan, akun belum siap", { description: res.warning });
        } else {
          if (res.status === 409) form.setError("email", { message: res.error });
          toast.error("Gagal menambahkan alumni", { description: res.error });
          return;
        }
      } else {
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
        if (error) {
          toast.error("Gagal menyimpan perubahan", { description: error.message });
          return;
        }

        // Alumni lama tanpa akun + email diisi -> buat akun & undang.
        if (!hasAccount && values.email.trim()) {
          const res = await postJson(`/api/admin/alumni/${alumniId}/account`, {
            email: normalizeEmail(values.email),
          });
          if (res.status >= 400) {
            if (res.status === 409) form.setError("email", { message: res.error });
            toast.warning("Data tersimpan, akun belum dibuat", { description: res.error });
            router.refresh();
            return;
          }
          toast.success("Data alumni diperbarui", { description: res.message });
        } else {
          toast.success("Data alumni berhasil diperbarui");
        }
      }

      setOpen(false);
      onSaved?.();
      router.refresh();
    } catch {
      toast.error("Terjadi kesalahan jaringan, coba lagi.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent
        onEscapeKeyDown={(e) => {
          // Esc saat saran email terbuka hanya menutup saran, bukan form.
          const el = document.activeElement;
          if (el instanceof HTMLElement && el.dataset.emailAutocomplete === "open") {
            e.preventDefault();
          }
        }}
      >
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

            <FormField
              control={form.control}
              name="email"
              render={({ field }) =>
                hasAccount && account ? (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <div className="flex flex-wrap items-center gap-2 rounded-md border bg-muted/40 px-3 py-2 text-sm">
                      <span className="min-w-0 break-all">{account.email}</span>
                      <Badge variant={ACCOUNT_STATUS_BADGE[account.status]}>
                        {ACCOUNT_STATUS_LABEL[account.status]}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Email akun login tidak diubah dari form ini.
                    </p>
                  </FormItem>
                ) : (
                  <FormItem>
                    <FormLabel>Email{isEdit ? " (opsional)" : ""}</FormLabel>
                    <FormControl>
                      <EmailAutocompleteInput
                        placeholder="contoh: ahmad212@gmail.com"
                        disabled={isSubmitting}
                        name={field.name}
                        ref={field.ref}
                        value={field.value}
                        onChange={field.onChange}
                        onBlur={field.onBlur}
                      />
                    </FormControl>
                    <p className="text-xs text-muted-foreground">
                      {isEdit
                        ? "Isi untuk membuat akun login dan mengirim undangan aktivasi."
                        : "Undangan aktivasi akun dikirim ke email ini setelah disimpan."}
                    </p>
                    <FormMessage />
                  </FormItem>
                )
              }
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
                {isSubmitting
                  ? "Menyimpan..."
                  : isEdit
                    ? "Simpan Perubahan"
                    : "Tambah & Kirim Undangan"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
