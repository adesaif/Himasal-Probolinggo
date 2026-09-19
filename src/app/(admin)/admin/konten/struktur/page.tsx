import { createClient } from "@/lib/supabase/server";
import { StructureList } from "@/components/admin/structure-list";

export default async function AdminKontenStrukturPage() {
  const supabase = await createClient();
  const { data: rows } = await supabase
    .from("organization_structure")
    .select("id, nama, jabatan, foto_url, display_order, is_active")
    .order("display_order");

  return <StructureList rows={rows ?? []} />;
}
