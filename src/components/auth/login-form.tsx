"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";

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
import { createClient } from "@/lib/supabase/client";
import { ROLE_HOME_ROUTE } from "@/lib/constants";
import { loginSchema, type LoginInput } from "@/lib/validators/auth";
import { HimasalLogo } from "@/components/shared/himasal-logo";

export function LoginForm() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  async function onSubmit(values: LoginInput) {
    setIsSubmitting(true);
    const supabase = createClient();

    const { data, error } = await supabase.auth.signInWithPassword(values);

    if (error || !data.user) {
      toast.error("Login gagal", {
        description:
          error?.message === "Invalid login credentials"
            ? "Email atau password salah."
            : (error?.message ?? "Terjadi kesalahan, coba lagi."),
      });
      setIsSubmitting(false);
      return;
    }

    // Role selalu dibaca dari database (profiles.role), tidak pernah dari
    // input/pilihan user di UI login.
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", data.user.id)
      .single();

    if (profileError || !profile) {
      toast.error("Gagal memuat profil", {
        description: "Silakan coba login kembali.",
      });
      await supabase.auth.signOut();
      setIsSubmitting(false);
      return;
    }

    toast.success("Berhasil masuk");
    router.push(ROLE_HOME_ROUTE[profile.role]);
    router.refresh();
  }

  return (
    <Card>
      <CardHeader>
        <div className="mb-2 flex justify-center">
          <HimasalLogo heightClassName="h-16" />
        </div>
        <CardTitle>Masuk ke Akun</CardTitle>
        <CardDescription>
          Satu halaman login untuk Alumni, Admin, dan Super Admin.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="flex flex-col gap-4"
            noValidate
          >
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      autoComplete="email"
                      placeholder="nama@email.com"
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
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Password</FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      autoComplete="current-password"
                      placeholder="********"
                      disabled={isSubmitting}
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
              isLoading={isSubmitting}
              loadingText="Memproses..."
            >
              Masuk
            </LoadingButton>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
