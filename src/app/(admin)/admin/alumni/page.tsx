import { createClient } from "@/lib/supabase/server";
import { AlumniList } from "@/components/admin/alumni-list";

export default async function AdminAlumniPage() {
  const supabase = await createClient();
  const { data: wilayahList } = await supabase
    .from("wilayah")
    .select("id, nama")
    .eq("is_active", true)
    .order("nama");

  return <AlumniList wilayahList={wilayahList ?? []} />;
}
