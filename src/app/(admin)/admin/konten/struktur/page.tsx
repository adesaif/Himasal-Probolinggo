import { createClient } from "@/lib/supabase/server";
import { StructureList } from "@/components/admin/structure-list";
import { isTopicFeaturedAllowed } from "@/lib/topics";

export default async function AdminKontenStrukturPage() {
  const supabase = await createClient();
  const [{ data: rows }, { data: topics }] = await Promise.all([
    supabase
      .from("organization_structure")
      .select("id, nama, jabatan, foto_url, display_order, is_active, is_featured")
      .order("display_order"),
    supabase.from("site_topics").select("key, is_active, allow_featured"),
  ]);

  return (
    <StructureList
      rows={rows ?? []}
      featuredAllowed={isTopicFeaturedAllowed(topics, "struktur")}
    />
  );
}
