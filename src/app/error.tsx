"use client";

import { useEffect } from "react";

import { HimasalLogo } from "@/components/shared/himasal-logo";
import { Button } from "@/components/ui/button";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Sengaja tidak console.error - Next.js sudah mencatat error ini sendiri
    // di server log / observability platform, sesuai arahan menghindari
    // console output yang tidak perlu di kode produksi.
  }, [error]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center">
      <HimasalLogo heightClassName="h-14" />
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Terjadi Kesalahan</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Maaf, terjadi kesalahan yang tidak terduga. Silakan coba lagi.
        </p>
      </div>
      <Button onClick={reset}>Coba Lagi</Button>
    </main>
  );
}
