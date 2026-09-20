import { createClient } from "@/lib/supabase/server";
import { TopicList } from "@/components/admin/topic-list";
import { TOPIC_SELECT_COLUMNS } from "@/lib/topics";

export default async function AdminTopikPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("site_topics")
    .select(TOPIC_SELECT_COLUMNS)
    .order("display_order");

  return <TopicList rows={data ?? []} />;
}
