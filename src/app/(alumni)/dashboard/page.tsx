import Link from "next/link";

import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

function ComingSoonCard({ title }: { title: string }) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-1">
        <p className="font-medium">{title}</p>
        <p className="text-sm text-muted-foreground">
          Modul ini akan dibangun pada fase implementasi berikutnya.
        </p>
      </CardContent>
    </Card>
  );
}

export default async function AlumniDashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const [{ data: profile }, { data: alumni }] = await Promise.all([
    supabase.from("profiles").select("full_name").eq("id", user.id).single(),
    supabase
      .from("alumni")
      .select("status_keanggotaan, angkatan, wilayah:wilayah_id(nama)")
      .eq("profile_id", user.id)
      .single(),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Halo, {profile?.full_name || "Alumni"}
        </h1>
        <p className="text-sm text-muted-foreground">
          Selamat datang di dashboard alumni HIMASAL Probolinggo.
        </p>
      </div>

      <Card>
        <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <p className="text-xs text-muted-foreground">Status Akun</p>
            <p className="font-medium capitalize">
              {alumni?.status_keanggotaan ?? "-"}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Wilayah</p>
            <p className="font-medium">{alumni?.wilayah?.nama ?? "-"}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Angkatan</p>
            <p className="font-medium">{alumni?.angkatan ?? "-"}</p>
          </div>
        </CardContent>
      </Card>

      <div>
        <Button asChild>
          <Link href="/dashboard/profil">Lihat / Lengkapi Profil</Link>
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <ComingSoonCard title="Agenda" />
        <ComingSoonCard title="Fiqh" />
        <ComingSoonCard title="Bank Soal" />
        <ComingSoonCard title="Kehadiran" />
      </div>
    </div>
  );
}
