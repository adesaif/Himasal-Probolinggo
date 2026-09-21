import type { Metadata } from "next";

import { createPublicClient } from "@/lib/supabase/public";
import { topicLabel } from "@/lib/topics";

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
  if (!content) return null;
  return (
    <section>
      <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
      <p className="mt-2 whitespace-pre-line text-muted-foreground">{content}</p>
    </section>
  );
}

export default async function ProfilPage() {
  const supabase = createPublicClient();
  const [{ data: profile }, { data: topic }] = await Promise.all([
    supabase.from("organization_profile").select("sejarah, visi, misi, tujuan, deskripsi").single(),
    supabase.from("site_topics").select("key, label").eq("key", "profil").maybeSingle(),
  ]);

  const hasAnyContent = Boolean(
    profile?.deskripsi || profile?.sejarah || profile?.visi || profile?.misi || profile?.tujuan,
  );

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          {topicLabel(topic ? [topic] : null, "profil", "Profil")} HIMASAL Probolinggo
        </h1>
      </div>

      {hasAnyContent ? (
        <>
          <Section title="Deskripsi Organisasi" content={profile?.deskripsi ?? null} />
          <Section title="Sejarah" content={profile?.sejarah ?? null} />
          <Section title="Visi" content={profile?.visi ?? null} />
          <Section title="Misi" content={profile?.misi ?? null} />
          <Section title="Tujuan" content={profile?.tujuan ?? null} />
        </>
      ) : (
        <p className="text-sm text-muted-foreground">
          Profil organisasi belum diisi oleh Admin.
        </p>
      )}
    </div>
  );
}
