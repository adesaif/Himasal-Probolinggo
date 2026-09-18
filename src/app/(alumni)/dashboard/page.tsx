import Link from "next/link";

import { Button } from "@/components/ui/button";

export default function AlumniDashboardPage() {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 px-4 text-center">
      <h1 className="text-2xl font-semibold tracking-tight">
        Dashboard Alumni
      </h1>
      <p className="max-w-md text-sm text-muted-foreground">
        Agenda, Fiqh, bank soal, dan absensi QR akan tersedia pada fase
        berikutnya. Untuk saat ini, lengkapi profil Anda.
      </p>
      <Button asChild>
        <Link href="/dashboard/profil">Lengkapi Profil</Link>
      </Button>
    </div>
  );
}
