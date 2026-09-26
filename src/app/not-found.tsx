import Link from "next/link";

import { HimasalLogo } from "@/components/shared/himasal-logo";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center">
      <HimasalLogo heightClassName="h-14" />
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Halaman Tidak Ditemukan</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Halaman yang Anda cari tidak ada atau sudah dipindahkan.
        </p>
      </div>
      <Button asChild>
        <Link href="/">Kembali ke Beranda</Link>
      </Button>
    </main>
  );
}
