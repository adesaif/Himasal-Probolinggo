import { createClient } from "@/lib/supabase/server";
import { NewsList } from "@/components/admin/news-list";
import { isTopicFeaturedAllowed } from "@/lib/topics";

export default async function AdminBeritaPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  const { category } = await searchParams;
  const supabase = await createClient();
  const [{ data: categories }, { data: topics }] = await Promise.all([
    supabase.from("categories").select("id, name, slug").order("display_order"),
    supabase.from("site_topics").select("key, is_active, allow_featured"),
  ]);

  return (
    <NewsList
      categories={categories ?? []}
      initialCategorySlug={category}
      featuredAllowed={isTopicFeaturedAllowed(topics, "berita")}
    />
  );
}
