import type { Metadata } from "next";

import { createPublicClient } from "@/lib/supabase/public";
import { Card, CardContent } from "@/components/ui/card";
import { OrganizationStructure } from "@/components/public/organization-structure";
import { buildOrganizationLayout } from "@/lib/organization-structure";
import { topicLabel } from "@/lib/topics";

const DESCRIPTION = "Susunan pengurus HIMASAL Probolinggo.";

export const metadata: Metadata = {
  title: "Struktur Organisasi",
  description: DESCRIPTION,
};

export const revalidate = 300;

export default async function StrukturPage() {
  const supabase = createPublicClient();
  const [{ data: structure }, { data: topic }] = await Promise.all([
    supabase
      .from("organization_structure")
      .select("id, nama, jabatan, foto_url")
      .eq("is_active", true)
      .order("display_order"),
    supabase.from("site_topics").select("key, label").eq("key", "struktur").maybeSingle(),
  ]);

  return (
    <div className="relative isolate flex flex-col gap-10 md:gap-12">
      {/* Grid tipis dekoratif di area atas, memudar ke bawah. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 -top-8 -z-10 h-[36rem] bg-[linear-gradient(to_right,var(--border)_1px,transparent_1px),linear-gradient(to_bottom,var(--border)_1px,transparent_1px)] [mask-image:radial-gradient(ellipse_70%_60%_at_50%_0%,black,transparent)] bg-[size:36px_36px] opacity-70"
      />

      <header className="md:mx-auto md:max-w-2xl md:text-center">
        <h1 className="text-3xl font-semibold tracking-tight text-brand-text-himasal md:text-4xl">
          {topicLabel(topic ? [topic] : null, "struktur", "Struktur")} Organisasi
        </h1>
        <p className="mt-2 text-muted-foreground">{DESCRIPTION}</p>
      </header>

      {!structure || structure.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            Data struktur organisasi belum tersedia.
          </CardContent>
        </Card>
      ) : (
        <OrganizationStructure layout={buildOrganizationLayout(structure)} />
      )}
    </div>
  );
}
