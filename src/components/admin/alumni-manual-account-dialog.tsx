"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { UserPlus } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
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
import { EmailAutocompleteInput } from "@/components/admin/email-autocomplete-input";
import { PasswordInput } from "@/components/shared/password-input";
import { normalizeEmail } from "@/lib/email-suggest";
import { staffAccountFormSchema, type StaffAccountFormValues } from "@/lib/validators/alumni";

const EMPTY: StaffAccountFormValues = { email: "", password: "", confirm: "" };

/**
 * Buat Akun Manual untuk Alumni yang belum punya akun: email + password awal,
 * akun langsung aktif TANPA email undangan. Diproses server-side
 * (POST /api/admin/alumni/:id/account/manual); password tidak disimpan di
 * aplikasi dan tidak pernah ditampilkan lagi setelah dialog ditutup.
 */
export function AlumniManualAccountDialog({
  alumniId,
  nama,
}: {
  alumniId: string;
  nama: string | null;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const form = useForm<StaffAccountFormValues>({
    resolver: zodResolver(staffAccountFormSchema),
    defaultValues: EMPTY,
  });

  function handleOpenChange(next: boolean) {
    if (isSaving) return;
    setOpen(next);
    setError(null);
    // Password tidak tertinggal di form setelah dialog ditutup/dibuka lagi.
    form.reset(EMPTY);
  }

  async function onSubmit(values: StaffAccountFormValues) {
    setIsSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/alumni/${alumniId}/account/manual`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: normalizeEmail(values.email), password: values.password }),
      });
      const body = (await res.json().catch(() => ({}))) as { message?: string; error?: string };
      if (!res.ok) {
        const message = body.error ?? "Gagal membuat akun.";
        setError(message);
        if (res.status === 409 && /email/i.test(message)) form.setError("email", { message });
        toast.error("Gagal membuat akun alumni", { description: message });
        return;
      }
      toast.success("Akun alumni dibuat", { description: body.message });
      form.reset(EMPTY);
      setOpen(false);
      router.refresh();
    } catch {
      setError("Terjadi kesalahan jaringan, coba lagi.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button className="w-full sm:w-fit">
          <UserPlus />
          Buat Akun Manual
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Buat Akun Alumni</DialogTitle>
          <DialogDescription>
            Buat akun login untuk {nama || "alumni ini"}. Akun langsung aktif tanpa email
            undangan. Serahkan password awal secara pribadi dan minta Alumni segera menggantinya
            di Profil → Keamanan Akun.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form className="flex flex-col gap-4" onSubmit={form.handleSubmit(onSubmit)} noValidate>
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <EmailAutocompleteInput
                      placeholder="contoh: ahmad212@gmail.com"
                      disabled={isSaving}
                      name={field.name}
                      ref={field.ref}
                      value={field.value}
                      onChange={field.onChange}
                      onBlur={field.onBlur}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Password Awal</FormLabel>
                  <FormControl>
                    <PasswordInput autoComplete="new-password" disabled={isSaving} {...field} />
                  </FormControl>
                  <p className="text-xs text-muted-foreground">
                    Minimal 8 karakter, berisi huruf dan angka.
                  </p>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="confirm"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Konfirmasi Password</FormLabel>
                  <FormControl>
                    <PasswordInput autoComplete="new-password" disabled={isSaving} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {error ? (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            ) : null}
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                disabled={isSaving}
                onClick={() => handleOpenChange(false)}
              >
                Batal
              </Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving ? "Membuat akun..." : "Buat Akun Alumni"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
