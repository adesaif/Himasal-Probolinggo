import { createClient } from "@/lib/supabase/server";
import { AlumniList } from "@/components/admin/alumni-list";
import { fetchLokasiAlumni } from "@/lib/alumni-lokasi";

export default async function AdminAlumniPage() {
  const supabase = await createClient();
  const lokasi = await fetchLokasiAlumni(supabase);

  return <AlumniList lokasi={lokasi} />;
}
