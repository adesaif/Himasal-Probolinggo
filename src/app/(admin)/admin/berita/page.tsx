import { createClient } from "@/lib/supabase/server";
import { NewsList } from "@/components/admin/news-list";

export default async function AdminBeritaPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  const { category } = await searchParams;
  const supabase = await createClient();
  const { data: categories } = await supabase
    .from("categories")
    .select("id, name, slug")
    .order("display_order");

  return <NewsList categories={categories ?? []} initialCategorySlug={category} />;
}
