import { createClient } from "@/lib/supabase/server";
import { OrganizationProfileForm } from "@/components/admin/organization-profile-form";
import { isTopicFeaturedAllowed } from "@/lib/topics";

export default async function AdminKontenProfilPage() {
  const supabase = await createClient();
  const [{ data: profile }, { data: topics }] = await Promise.all([
    supabase
      .from("organization_profile")
      .select("id, sejarah, visi, misi, tujuan, deskripsi, image_url, is_featured")
      .single(),
    supabase.from("site_topics").select("key, is_active, allow_featured"),
  ]);

  if (!profile) {
    return (
      <p className="text-sm text-destructive">
        Baris profil organisasi tidak ditemukan. Hubungi developer.
      </p>
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-6 text-2xl font-semibold tracking-tight">
        Profil Organisasi
      </h1>
      <OrganizationProfileForm
        id={profile.id}
        initialValues={{
          sejarah: profile.sejarah ?? "",
          visi: profile.visi ?? "",
          misi: profile.misi ?? "",
          tujuan: profile.tujuan ?? "",
          deskripsi: profile.deskripsi ?? "",
        }}
        initialImageUrl={profile.image_url}
        initialIsFeatured={profile.is_featured}
        featuredAllowed={isTopicFeaturedAllowed(topics, "profil")}
      />
    </div>
  );
}
