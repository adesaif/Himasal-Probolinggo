import { createClient } from "@/lib/supabase/server";
import { SiteSettingsForm } from "@/components/admin/site-settings-form";

export default async function AdminKontenPengaturanPage() {
  const supabase = await createClient();
  const { data: settings } = await supabase
    .from("site_settings")
    .select(
      "id, nama_organisasi, tagline, alamat, email, telepon, whatsapp, instagram_url, facebook_url, youtube_url, tiktok_url, maps_embed_url",
    )
    .single();

  if (!settings) {
    return (
      <p className="text-sm text-destructive">
        Baris pengaturan situs tidak ditemukan. Hubungi developer.
      </p>
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-6 text-2xl font-semibold tracking-tight">
        Pengaturan Situs
      </h1>
      <SiteSettingsForm
        id={settings.id}
        initialValues={{
          nama_organisasi: settings.nama_organisasi ?? "",
          tagline: settings.tagline ?? "",
          alamat: settings.alamat ?? "",
          email: settings.email ?? "",
          telepon: settings.telepon ?? "",
          whatsapp: settings.whatsapp ?? "",
          instagram_url: settings.instagram_url ?? "",
          facebook_url: settings.facebook_url ?? "",
          youtube_url: settings.youtube_url ?? "",
          tiktok_url: settings.tiktok_url ?? "",
          maps_embed_url: settings.maps_embed_url ?? "",
        }}
      />
    </div>
  );
}
