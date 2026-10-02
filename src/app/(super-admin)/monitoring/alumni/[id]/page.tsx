import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { AlumniMasterDetail } from "@/components/alumni/alumni-master-detail";
import { fetchAlumniActivityDetail, parseYearParam } from "@/lib/alumni-activity";

// Detail Alumni untuk Super Admin: master view yang sama dengan Admin &
// Dashboard Alumni, READ-ONLY (tanpa aksi). No HP & tanggal lahir sudah
// disembunyikan oleh RPC untuk Super Admin.
export default async function MonitoringAlumniDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tahun?: string }>;
}) {
  const { id } = await params;
  const { tahun } = await searchParams;
  const supabase = await createClient();
  const { detail } = await fetchAlumniActivityDetail(supabase, {
    alumniId: id,
    year: parseYearParam(tahun),
  });

  if (!detail) notFound();

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-4">
      <Button variant="ghost" size="sm" asChild className="w-fit">
        <Link href="/monitoring/alumni">
          <ArrowLeft />
          Kembali ke Monitoring Alumni
        </Link>
      </Button>
      <AlumniMasterDetail
        detail={detail}
        yearHref={(y) => `/monitoring/alumni/${id}?tahun=${y}`}
        eventHref={(eventId) => `/monitoring/kegiatan/${eventId}`}
      />
    </div>
  );
}
