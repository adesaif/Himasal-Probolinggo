import { createClient } from "@/lib/supabase/server";
import { HeroSlideList } from "@/components/admin/hero-slide-list";

export default async function AdminKontenHeroPage() {
  const supabase = await createClient();
  const { data: rows } = await supabase
    .from("hero_slides")
    .select("id, image_url, alt_text, display_order, is_active")
    .order("display_order");

  return <HeroSlideList rows={rows ?? []} />;
}
