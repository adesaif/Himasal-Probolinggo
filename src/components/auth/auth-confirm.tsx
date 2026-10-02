"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { EmailOtpType } from "@supabase/supabase-js";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { HimasalLogo } from "@/components/shared/himasal-logo";
import { createClient } from "@/lib/supabase/client";

const OTP_TYPES: EmailOtpType[] = ["invite", "recovery", "signup", "magiclink", "email"];

function describeLinkError(code: string | null, description: string | null) {
  if (code === "otp_expired") {
    return "Link aktivasi sudah kedaluwarsa atau sudah pernah dipakai. Minta Admin HIMASAL mengirim ulang undangan.";
  }
  return description
    ? `Link aktivasi tidak valid: ${description}`
    : "Link aktivasi tidak valid. Minta Admin HIMASAL mengirim ulang undangan.";
}

/**
 * Tujuan link undangan/aktivasi dari email Supabase Auth. Mendukung dua
 * bentuk link:
 *  - ?token_hash=...&type=invite  (template email yang direkomendasikan)
 *  - #access_token=...&refresh_token=... (template bawaan {{ .ConfirmationURL }})
 * Setelah sesi terbentuk, token dihapus dari URL lalu alumni diarahkan ke
 * /aktivasi-akun untuk membuat password sendiri.
 */
export function AuthConfirm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Baca URL sebelum apa pun sempat mengubahnya.
    const query = new URLSearchParams(window.location.search);
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    let cancelled = false;

    async function confirm() {
      const errorCode = hash.get("error_code") ?? query.get("error_code");
      const errorDescription = hash.get("error_description") ?? query.get("error_description");
      if (errorCode || errorDescription) {
        setError(describeLinkError(errorCode, errorDescription));
        return;
      }

      const supabase = createClient();
      let failure: string | null = null;

      const tokenHash = query.get("token_hash");
      const type = query.get("type") as EmailOtpType | null;
      const accessToken = hash.get("access_token");
      const refreshToken = hash.get("refresh_token");
      const code = query.get("code");

      if (tokenHash && type && OTP_TYPES.includes(type)) {
        const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
        if (error) failure = describeLinkError(error.code ?? null, error.message);
      } else if (accessToken && refreshToken) {
        const { error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
        if (error) failure = describeLinkError(error.code ?? null, error.message);
      } else if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) failure = describeLinkError(error.code ?? null, error.message);
      } else {
        failure = describeLinkError(null, null);
      }

      if (cancelled) return;
      // Token tidak boleh tertinggal di riwayat browser.
      window.history.replaceState(null, "", "/auth/confirm");
      if (failure) {
        setError(failure);
        return;
      }
      router.replace("/aktivasi-akun");
      router.refresh();
    }

    confirm();
    return () => {
      cancelled = true;
    };
  }, [router]);

  return (
    <Card>
      <CardHeader>
        <div className="mb-2 flex justify-center">
          <HimasalLogo heightClassName="h-16" />
        </div>
        <CardTitle>{error ? "Aktivasi Gagal" : "Memverifikasi Akun..."}</CardTitle>
        <CardDescription>
          {error ?? "Mohon tunggu, link aktivasi akun HIMASAL sedang diperiksa."}
        </CardDescription>
      </CardHeader>
      {error ? (
        <CardContent>
          <Button asChild variant="outline" className="w-full">
            <Link href="/login">Ke Halaman Login</Link>
          </Button>
        </CardContent>
      ) : null}
    </Card>
  );
}
