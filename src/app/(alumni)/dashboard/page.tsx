import Link from "next/link";
import { QrCode, UserPen } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AlumniMasterDetail } from "@/components/alumni/alumni-master-detail";
import { fetchAlumniActivityDetail, parseYearParam } from "@/lib/alumni-activity";

// Dashboard Alumni: master view milik SENDIRI - RPC dipanggil tanpa id,
// sehingga database memakai akun yang sedang login (Alumni tidak pernah
// bisa membuka data Alumni lain). Tampilan sama dengan Admin & Monitoring.
export default async function AlumniDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ tahun?: string }>;
}) {
  const { tahun } = await searchParams;
  const supabase = await createClient();
  const { detail, error } = await fetchAlumniActivityDetail(supabase, {
    year: parseYearParam(tahun),
  });

  const actions = (
    <>
      <Button asChild size="sm">
        <Link href="/dashboard/absensi">
          <QrCode />
          Absensi
        </Link>
      </Button>
      <Button asChild size="sm" variant="outline">
        <Link href="/dashboard/profil">
          <UserPen />
          Profil
        </Link>
      </Button>
    </>
  );

  if (!detail) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard Alumni</h1>
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            {error?.message ?? "Data alumni belum tersedia."} Hubungi Admin HIMASAL bila
            akun Anda belum terhubung dengan data alumni.
          </CardContent>
        </Card>
        <div className="flex gap-2">{actions}</div>
      </div>
    );
  }

  return (
    <div id="riwayat" className="flex flex-col gap-4">
      <AlumniMasterDetail
        detail={detail}
        yearHref={(y) => `/dashboard?tahun=${y}`}
        actions={actions}
      />
    </div>
  );
}
