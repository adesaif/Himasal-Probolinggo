import Link from "next/link";
import { QrCode, UserPen } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AlumniMasterDetail } from "@/components/alumni/alumni-master-detail";
import { fetchAlumniActivityDetail, parseYearParam } from "@/lib/alumni-activity";

// Beranda Alumni: master view milik SENDIRI - RPC dipanggil tanpa id,
// sehingga database mencari data alumni lewat profile_id akun yang sedang
// login (Alumni tidak pernah bisa membuka data Alumni lain). Tampilan sama
// dengan Admin & Monitoring; status/persentase dihitung di database.
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
        <Link href="/dashboard/absensi/scan">
          <QrCode />
          Scan QR
        </Link>
      </Button>
      <Button asChild size="sm" variant="outline">
        <Link href="/dashboard/profil">
          <UserPen />
          Edit Profil
        </Link>
      </Button>
    </>
  );

  if (!detail) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-2xl font-semibold tracking-tight">Beranda</h1>
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            {error?.message ?? "Data alumni belum tersedia."} Hubungi Admin HIMASAL bila
            akun Anda belum terhubung dengan data alumni.
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <AlumniMasterDetail
      detail={detail}
      yearHref={(y) => `/dashboard?tahun=${y}`}
      eventHref={(eventId) => `/agenda/${eventId}`}
      actions={actions}
      hideAccountStatus
      underlineEventLinks
    />
  );
}
