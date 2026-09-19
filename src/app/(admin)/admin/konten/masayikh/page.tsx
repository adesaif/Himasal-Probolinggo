import { createClient } from "@/lib/supabase/server";
import { MasayikhList } from "@/components/admin/masayikh-list";

export default async function AdminKontenMasayikhPage() {
  const supabase = await createClient();
  const { data: rows } = await supabase
    .from("masayikh")
    .select("id, nama, deskripsi, foto_url, display_order, is_active")
    .order("display_order");

  return <MasayikhList rows={rows ?? []} />;
}
