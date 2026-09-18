import type { Metadata } from "next";

import { createPublicClient } from "@/lib/supabase/public";

export const metadata: Metadata = {
  title: "Profil",
  description: "Sejarah, visi, misi, dan tujuan HIMASAL Probolinggo.",
};

export const revalidate = 300;

function Section({
  title,
  content,
}: {
  title: string;
  content: string | null;
}) {
  return (
    <section>
      <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
      <p className="mt-2 whitespace-pre-line text-muted-foreground">
        {content || "Konten sedang disiapkan oleh Admin."}
      </p>
    </section>
  );
}

export default async function ProfilPage() {
  const supabase = createPublicClient();
  const { data: profile } = await supabase
    .from("organization_profile")
    .select("sejarah, visi, misi, tujuan, deskripsi")
    .single();

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Profil HIMASAL Probolinggo
        </h1>
      </div>

      <Section title="Deskripsi Organisasi" content={profile?.deskripsi ?? null} />
      <Section title="Sejarah" content={profile?.sejarah ?? null} />
      <Section title="Visi" content={profile?.visi ?? null} />
      <Section title="Misi" content={profile?.misi ?? null} />
      <Section title="Tujuan" content={profile?.tujuan ?? null} />
    </div>
  );
}
