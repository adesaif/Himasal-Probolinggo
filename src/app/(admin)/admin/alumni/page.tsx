import { createClient } from "@/lib/supabase/server";
import { AlumniList, type AlumniListFilters } from "@/components/admin/alumni-list";
import { fetchLokasiAlumni } from "@/lib/alumni-lokasi";

export default async function AdminAlumniPage({
  searchParams,
}: {
  // Filter awal dari URL - tujuan drill-down Dashboard Admin (kecamatan,
  // status keaktifan, status akun, tahun).
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
      mode="admin"
      years={(years ?? []).map((y) => y.year)}
      initialFilters={filters}
    />
  );
}
