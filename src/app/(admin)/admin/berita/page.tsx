import { createClient } from "@/lib/supabase/server";
import { NewsList } from "@/components/admin/news-list";
import { TOPIC_SELECT_COLUMNS } from "@/lib/topics";

export default async function AdminBeritaPage() {
  const supabase = await createClient();
  const { data: topics } = await supabase
    .from("site_topics")
    .select(TOPIC_SELECT_COLUMNS)
    .order("display_order");

  return <NewsList topics={topics ?? []} />;
}
