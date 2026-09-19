import { createClient } from "@/lib/supabase/server";
import { ProfileForm } from "@/components/alumni/profile-form";

export default async function AlumniProfilPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    // Proxy already guards this route; this is only a defensive fallback.
    return null;
  }

  const [{ data: profile }, { data: alumni }, { data: wilayahList }] =
    await Promise.all([
      supabase
        .from("profiles")
        .select("full_name, phone, member_id")
        .eq("id", user.id)
        .single(),
      supabase
        .from("alumni")
        .select("tempat_lahir, tanggal_lahir, alamat, wilayah_id, angkatan, status_keanggotaan")
        .eq("profile_id", user.id)
        .single(),
      supabase
        .from("wilayah")
        .select("id, nama")
        .eq("is_active", true)
        .order("nama"),
    ]);

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-6 text-2xl font-semibold tracking-tight">
        Profil Saya
      </h1>
      <ProfileForm
        initialValues={{
          full_name: profile?.full_name ?? "",
          phone: profile?.phone ?? "",
          tempat_lahir: alumni?.tempat_lahir ?? "",
          tanggal_lahir: alumni?.tanggal_lahir ?? "",
          alamat: alumni?.alamat ?? "",
          wilayah_id: alumni?.wilayah_id ?? "",
        }}
        wilayahList={wilayahList ?? []}
        memberInfo={{
          member_id: profile?.member_id ?? null,
          angkatan: alumni?.angkatan ?? null,
          status_keanggotaan: alumni?.status_keanggotaan ?? "aktif",
        }}
      />
    </div>
  );
}
