import { createClient } from "@/lib/supabase/server";
import { GalleryList } from "@/components/admin/gallery-list";
import { isTopicFeaturedAllowed } from "@/lib/topics";

export default async function AdminGaleriPage() {
  const supabase = await createClient();
  const { data: topics } = await supabase
    .from("site_topics")
    .select("key, is_active, allow_featured");

  return <GalleryList featuredAllowed={isTopicFeaturedAllowed(topics, "galeri")} />;
}
