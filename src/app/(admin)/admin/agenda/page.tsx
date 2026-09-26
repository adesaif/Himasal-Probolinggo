import { createClient } from "@/lib/supabase/server";
import { EventList } from "@/components/admin/event-list";
import { isTopicFeaturedAllowed } from "@/lib/topics";

export default async function AdminAgendaPage() {
  const supabase = await createClient();
  const { data: topics } = await supabase
    .from("site_topics")
    .select("key, is_active, allow_featured");

  return <EventList featuredAllowed={isTopicFeaturedAllowed(topics, "agenda")} />;
}
