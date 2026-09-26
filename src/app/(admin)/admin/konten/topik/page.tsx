import { createClient } from "@/lib/supabase/server";
import { TopicList } from "@/components/admin/topic-list";
import { TOPIC_SELECT_COLUMNS } from "@/lib/topics";

export default async function AdminTopikPage() {
  const supabase = await createClient();

  const [
    { data },
    { count: beritaCount },
    { count: agendaCount },
    { count: galeriCount },
    { count: strukturCount },
    { count: masayikhCount },
    { data: topicContentRows },
  ] = await Promise.all([
    supabase.from("site_topics").select(TOPIC_SELECT_COLUMNS).order("display_order"),
    supabase.from("news").select("id", { count: "exact", head: true }),
    supabase.from("events").select("id", { count: "exact", head: true }),
    supabase.from("gallery_items").select("id", { count: "exact", head: true }),
    supabase.from("organization_structure").select("id", { count: "exact", head: true }),
    supabase.from("masayikh").select("id", { count: "exact", head: true }),
    // Konten generik (Konten + topik custom) dibackup satu tabel bersama -
    // dihitung per topic_id di sini supaya dialog hapus tahu jumlah
    // konten yang akan "kehilangan topik" (bukan ikut terhapus).
    supabase.from("topic_content").select("id, topic_id"),
  ]);

  const genericCounts = new Map<string, number>();
  for (const row of topicContentRows ?? []) {
    if (!row.topic_id) continue;
    genericCounts.set(row.topic_id, (genericCounts.get(row.topic_id) ?? 0) + 1);
  }

  // Konten terkait per topik sistem. "profil" adalah singleton (selalu 1
  // baris) sehingga tidak relevan dihitung. Topik generik (is_system=false,
  // termasuk "konten" dan topik custom) mengambil hitungannya dari
  // genericCounts di atas, keyed oleh id topik (bukan key).
  const systemCounts: Partial<Record<string, number>> = {
    berita: beritaCount ?? 0,
    agenda: agendaCount ?? 0,
    galeri: galeriCount ?? 0,
    struktur: strukturCount ?? 0,
    masayikh: masayikhCount ?? 0,
  };

  const rows = data ?? [];
  const contentCounts: Record<string, number> = {};
  for (const topic of rows) {
    contentCounts[topic.id] = topic.is_system
      ? (systemCounts[topic.key] ?? 0)
      : (genericCounts.get(topic.id) ?? 0);
  }

  return <TopicList rows={rows} contentCounts={contentCounts} />;
}
