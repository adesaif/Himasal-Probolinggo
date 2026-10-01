import { createClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { ProfileForm } from "@/components/alumni/profile-form";
import { fetchLokasiAlumni } from "@/lib/alumni-lokasi";

function ReadOnlyField({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 font-medium break-words">{value || "-"}</dd>
    </div>
  );
}

// Profil Saya: membaca & menulis MASTER alumni (dicari lewat profile_id
// akun yang login, bukan email). Member ID & angkatan hanya dikelola Admin.
export default async function AlumniProfilPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    // Proxy sudah menjaga rute ini; ini hanya fallback defensif.
    return null;
  }

  const [{ data: profile }, { data: alumni }, lokasi] = await Promise.all([
    supabase.from("profiles").select("member_id").eq("id", user.id).single(),
    supabase
      .from("alumni")
      .select(
        "nama_lengkap, no_hp, tempat_lahir, tanggal_lahir, alamat, angkatan, kecamatan_id, desa_kelurahan_id",
      )
      .eq("profile_id", user.id)
      .maybeSingle(),
    fetchLokasiAlumni(supabase),
  ]);

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Profil Saya</h1>
        <p className="text-sm text-muted-foreground">
          Data ini menjadi data resmi Anda sebagai Alumni HIMASAL.
        </p>
      </div>

      {!alumni ? (
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            Akun Anda belum terhubung dengan data alumni. Hubungi Admin HIMASAL.
          </CardContent>
        </Card>
      ) : (
        <>
          <Card className="bg-muted/30">
            <CardContent className="flex flex-col gap-3">
              <dl className="grid grid-cols-2 gap-4">
                <ReadOnlyField label="Member ID" value={profile?.member_id ?? null} />
                <ReadOnlyField label="Angkatan" value={alumni.angkatan?.toString() ?? null} />
              </dl>
              <p className="text-xs text-muted-foreground">
                Member ID dan angkatan hanya dapat diubah oleh Admin.
              </p>
            </CardContent>
          </Card>

          <ProfileForm
            lokasi={lokasi}
            initialValues={{
              full_name: alumni.nama_lengkap ?? "",
              phone: alumni.no_hp ?? "",
              tempat_lahir: alumni.tempat_lahir ?? "",
              tanggal_lahir: alumni.tanggal_lahir ?? "",
              alamat: alumni.alamat ?? "",
              kecamatan_id: alumni.kecamatan_id,
              desa_kelurahan_id: alumni.desa_kelurahan_id,
            }}
          />
        </>
      )}
    </div>
  );
}
