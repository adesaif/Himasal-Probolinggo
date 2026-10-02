import { createClient } from "@/lib/supabase/server";
import { CategoryList } from "@/components/admin/category-list";

export default async function AdminKontenKategoriPage() {
  const supabase = await createClient();
  const { data: rows } = await supabase
    .from("categories")
    .select("id, name, slug, tagline, display_order, is_active, show_on_homepage")
    .order("display_order");

  return <CategoryList rows={rows ?? []} />;
}
