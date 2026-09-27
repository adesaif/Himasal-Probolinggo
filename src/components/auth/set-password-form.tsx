"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LoadingButton } from "@/components/shared/loading-button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { HimasalLogo } from "@/components/shared/himasal-logo";
import { createClient } from "@/lib/supabase/client";
import { ROLE_HOME_ROUTE } from "@/lib/constants";

const setPasswordSchema = z
  .object({
    password: z
      .string()
      .min(8, "Password minimal 8 karakter")
      .max(72, "Password maksimal 72 karakter")
      .regex(/[A-Za-z]/, "Password harus mengandung huruf")
      .regex(/[0-9]/, "Password harus mengandung angka"),
    confirm: z.string(),
  })
  .refine((v) => v.password === v.confirm, {
    message: "Konfirmasi password tidak sama",
    path: ["confirm"],
  });

type SetPasswordInput = z.infer<typeof setPasswordSchema>;

/**
 * Alumni membuat password SENDIRI setelah membuka link undangan (sesi
 * dibuat oleh /auth/confirm). Tidak ada password yang dibuat sistem atau
 * dikirim lewat email.
 */
export function SetPasswordForm() {
  const router = useRouter();
  const [email, setEmail] = useState<string | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "no-session">("loading");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<SetPasswordInput>({
    resolver: zodResolver(setPasswordSchema),
    defaultValues: { password: "", confirm: "" },
  });

  useEffect(() => {
    createClient()
      .auth.getUser()
      .then(({ data }) => {
        if (data.user) {
          setEmail(data.user.email ?? null);
          setState("ready");
        } else {
          setState("no-session");
        }
      });
  }, []);

  async function onSubmit(values: SetPasswordInput) {
    setIsSubmitting(true);
    const supabase = createClient();
    const { data, error } = await supabase.auth.updateUser({ password: values.password });

    if (error || !data.user) {
      setIsSubmitting(false);
      toast.error("Gagal menyimpan password", {
        description:
          error?.code === "same_password"
            ? "Password baru harus berbeda dari password sebelumnya."
            : (error?.message ?? "Coba lagi."),
      });
      return;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", data.user.id)
      .maybeSingle();

    toast.success("Akun aktif", {
      description: "Selanjutnya login memakai email dan password ini.",
    });
    router.replace(profile?.role ? ROLE_HOME_ROUTE[profile.role] : "/login");
    router.refresh();
  }

  return (
    <Card>
      <CardHeader>
        <div className="mb-2 flex justify-center">
          <HimasalLogo heightClassName="h-16" />
        </div>
        <CardTitle>Aktifkan Akun HIMASAL</CardTitle>
        <CardDescription>
          {state === "no-session"
            ? "Sesi aktivasi tidak ditemukan atau sudah berakhir. Buka kembali link dari email undangan, atau minta Admin HIMASAL mengirim ulang undangan."
            : "Buat password untuk akun Anda. Password ini dipakai untuk login selanjutnya."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {state === "no-session" ? (
          <Button asChild variant="outline" className="w-full">
            <Link href="/login">Ke Halaman Login</Link>
          </Button>
        ) : (
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className="flex flex-col gap-4"
              noValidate
            >
              {email ? (
                <p className="rounded-md border bg-muted/40 px-3 py-2 text-sm break-all">
                  Akun: <span className="font-medium">{email}</span>
                </p>
              ) : null}
              <input
                type="email"
                name="username"
                autoComplete="username"
                value={email ?? ""}
                readOnly
                hidden
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password Baru</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        autoComplete="new-password"
                        disabled={state !== "ready" || isSubmitting}
                        {...field}
                      />
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
                    <FormLabel>Ulangi Password</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        autoComplete="new-password"
                        disabled={state !== "ready" || isSubmitting}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <LoadingButton
                type="submit"
                className="w-full"
                disabled={state !== "ready"}
                isLoading={isSubmitting}
                loadingText="Menyimpan..."
              >
                Simpan Password & Aktifkan
              </LoadingButton>
            </form>
          </Form>
        )}
      </CardContent>
    </Card>
  );
}
