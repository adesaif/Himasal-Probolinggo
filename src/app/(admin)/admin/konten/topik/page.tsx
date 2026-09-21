import { createClient } from "@/lib/supabase/server";
import { TopicList } from "@/components/admin/topic-list";
import { TOPIC_SELECT_COLUMNS, type TopicKey } from "@/lib/topics";

export default async function AdminTopikPage() {
  const supabase = await createClient();

  const [
    { data },
    { count: beritaCount },
    { count: agendaCount },
    { count: galeriCount },
    { count: strukturCount },
    { count: masayikhCount },
  ] = await Promise.all([
    supabase.from("site_topics").select(TOPIC_SELECT_COLUMNS).order("display_order"),
    supabase.from("news").select("id", { count: "exact", head: true }),
    supabase.from("events").select("id", { count: "exact", head: true }),
    supabase.from("gallery_items").select("id", { count: "exact", head: true }),
    supabase.from("organization_structure").select("id", { count: "exact", head: true }),
    supabase.from("masayikh").select("id", { count: "exact", head: true }),
  ]);

  // Konten terkait per topik. "profil" adalah singleton (selalu 1 baris)
  // dan "konten" bukan tipe konten publik (hub admin, tidak punya
  // tabel konten sendiri) - keduanya tidak relevan dihitung.
  const contentCounts: Partial<Record<TopicKey, number>> = {
    berita: beritaCount ?? 0,
    agenda: agendaCount ?? 0,
    galeri: galeriCount ?? 0,
    struktur: strukturCount ?? 0,
    masayikh: masayikhCount ?? 0,
  };

  return <TopicList rows={data ?? []} contentCounts={contentCounts} />;
}
