"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { AuthError } from "@supabase/supabase-js";
import { KeyRound } from "lucide-react";
import { toast } from "sonner";

import { Card, CardContent } from "@/components/ui/card";
import { LoadingButton } from "@/components/shared/loading-button";
import { PasswordInput } from "@/components/shared/password-input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { createClient } from "@/lib/supabase/client";
import { changePasswordSchema, type ChangePasswordInput } from "@/lib/validators/profile";

const EMPTY: ChangePasswordInput = { current_password: "", new_password: "", confirm: "" };

type PasswordErrorInfo = { message: string; field?: keyof ChangePasswordInput };

/** Pesan Indonesia (dan field terkait) untuk error Supabase Auth. */
function describePasswordError(error: AuthError): PasswordErrorInfo {
  switch (error.code) {
    case "same_password":
      return { message: "Password baru harus berbeda dari password lama.", field: "new_password" };
    case "weak_password":
      return {
        message:
          "Password baru terlalu lemah menurut aturan keamanan akun. Gunakan password yang lebih panjang dan sulit ditebak.",
        field: "new_password",
      };
    case "reauthentication_needed":
    case "reauthentication_not_valid":
      return {
        message: "Demi keamanan, silakan logout lalu login kembali, kemudian ulangi ganti password.",
      };
    case "session_not_found":
      return { message: "Sesi login berakhir. Silakan login kembali." };
    case "over_request_rate_limit":
      return { message: "Terlalu banyak percobaan. Tunggu beberapa saat lalu coba lagi." };
  }
  // Cadangan bila respons tidak membawa kode error.
  if (/different from the old password/i.test(error.message)) {
    return describePasswordError({ ...error, code: "same_password" } as AuthError);
  }
  if (/reauthenticat/i.test(error.message)) {
    return describePasswordError({ ...error, code: "reauthentication_needed" } as AuthError);
  }
  // Password lama salah / belum dikirim (opsi "Require current password"
  // Supabase Auth). Kode baru belum ada di daftar auth-js, jadi pesan juga
  // dicocokkan.
  if (
    error.code === "current_password_mismatch" ||
    error.code === "current_password_required" ||
    error.code === "invalid_credentials" ||
    /current password/i.test(error.message)
  ) {
    return { message: "Password lama salah.", field: "current_password" };
  }
  return { message: error.message };
}

/**
 * Ganti password akun SENDIRI. Target akun ditentukan oleh sesi login
 * (supabase.auth.updateUser), bukan input - email hanya ditampilkan.
 * Password lama divalidasi server oleh Supabase Auth lewat current_password;
 * password tidak pernah disimpan di database aplikasi. Setelah berhasil,
 * sesi di perangkat lain dikeluarkan (sesi perangkat ini tetap aktif).
 */
export function ChangePasswordForm({ email }: { email: string }) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const form = useForm<ChangePasswordInput>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: EMPTY,
  });

  async function onSubmit(values: ChangePasswordInput) {
    setIsSubmitting(true);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({
      password: values.new_password,
      current_password: values.current_password,
    });

    if (error) {
      setIsSubmitting(false);
      const { message, field } = describePasswordError(error);
      if (field) form.setError(field, { message });
      toast.error("Gagal mengganti password", { description: message });
      return;
    }

    form.reset(EMPTY);
    toast.success("Password berhasil diganti", {
      description: "Gunakan password baru saat login berikutnya.",
    });

    const { error: signOutError } = await supabase.auth.signOut({ scope: "others" });
    setIsSubmitting(false);
    if (signOutError) {
      toast.warning("Sesi di perangkat lain belum dikeluarkan", {
        description: "Logout lalu login kembali untuk memastikan perangkat lain keluar.",
      });
    }
  }

  return (
    <Card>
      <CardContent className="flex flex-col gap-4">
        <div className="flex items-start gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <KeyRound className="size-4" aria-hidden="true" />
          </span>
          <div>
            <h2 className="font-semibold tracking-tight">Keamanan Akun</h2>
            <p className="text-sm text-muted-foreground">
              Ganti password login Anda. Perangkat lain akan otomatis keluar.
            </p>
          </div>
        </div>

        <div className="min-w-0 rounded-lg border bg-muted/30 px-3 py-2 text-sm">
          <p className="text-xs text-muted-foreground">Email akun</p>
          <p className="font-medium break-all">{email || "-"}</p>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
            {/* Membantu password manager mengaitkan password dengan akun ini. */}
            <input
              type="email"
              name="username"
              autoComplete="username"
              value={email}
              readOnly
              hidden
            />
            <FormField
              control={form.control}
              name="current_password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Password Lama</FormLabel>
                  <FormControl>
                    <PasswordInput
                      autoComplete="current-password"
                      disabled={isSubmitting}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="new_password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Password Baru</FormLabel>
                  <FormControl>
                    <PasswordInput autoComplete="new-password" disabled={isSubmitting} {...field} />
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
                  <FormLabel>Konfirmasi Password Baru</FormLabel>
                  <FormControl>
                    <PasswordInput autoComplete="new-password" disabled={isSubmitting} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex justify-end">
              <LoadingButton
                type="submit"
                isLoading={isSubmitting}
                loadingText="Menyimpan..."
                className="w-full sm:w-auto"
              >
                Ganti Password
              </LoadingButton>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
