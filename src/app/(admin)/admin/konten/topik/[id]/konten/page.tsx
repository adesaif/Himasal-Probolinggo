import { notFound } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { TopicContentList } from "@/components/admin/topic-content-list";
import { isTopicFeaturedAllowed } from "@/lib/topics";

export default async function AdminTopicContentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: topic } = await supabase
    .from("site_topics")
    .select("id, key, label, is_active, allow_featured, is_system")
    .eq("id", id)
    .maybeSingle();

  // Topik sistem (Berita/Agenda/dst) sudah punya halaman CRUD khusus -
  // rute generik ini hanya untuk topik yang dibackup topic_content
  // (Konten + topik custom buatan Admin).
  if (!topic || topic.is_system) {
    notFound();
  }

  return (
    <TopicContentList
      topicId={topic.id}
      topicLabel={topic.label}
      featuredAllowed={isTopicFeaturedAllowed([topic], topic.key)}
    />
  );
}
