import { createClient } from "@/lib/supabase/server";
import { MasayikhList } from "@/components/admin/masayikh-list";
import { isTopicFeaturedAllowed } from "@/lib/topics";

export default async function AdminKontenMasayikhPage() {
  const supabase = await createClient();
  const [{ data: rows }, { data: topics }] = await Promise.all([
    supabase
      .from("masayikh")
      .select("id, nama, deskripsi, foto_url, display_order, is_active, is_featured")
      .order("display_order"),
    supabase.from("site_topics").select("key, is_active, allow_featured"),
  ]);

  return (
    <MasayikhList
      rows={rows ?? []}
      featuredAllowed={isTopicFeaturedAllowed(topics, "masayikh")}
    />
  );
}
