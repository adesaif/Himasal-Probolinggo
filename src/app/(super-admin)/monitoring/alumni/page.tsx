import { createClient } from "@/lib/supabase/server";
import { AlumniList, type AlumniListFilters } from "@/components/admin/alumni-list";
import { fetchLokasiAlumni } from "@/lib/alumni-lokasi";

// Monitoring Alumni (Super Admin, read-only) - komponen & RPC yang SAMA
// dengan Admin -> Alumni, tanpa aksi tambah/hapus. Filter awal dari URL
// (drill-down dari Ringkasan).
export default async function MonitoringAlumniPage({
  searchParams,
}: {
  searchParams: Promise<AlumniListFilters>;
}) {
  const filters = await searchParams;
  const supabase = await createClient();
  const [lokasi, { data: years }] = await Promise.all([
    fetchLokasiAlumni(supabase),
    supabase.rpc("monitoring_available_years"),
  ]);

  return (
    <AlumniList
      lokasi={lokasi}
      mode="monitoring"
      years={(years ?? []).map((y) => y.year)}
      initialFilters={filters}
    />
  );
}
