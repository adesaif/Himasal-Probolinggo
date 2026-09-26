import type { Metadata } from "next";

import { createPublicClient } from "@/lib/supabase/public";
import { Card, CardContent } from "@/components/ui/card";
import { topicLabel } from "@/lib/topics";

export const metadata: Metadata = {
  title: "Struktur Organisasi",
  description: "Susunan pengurus HIMASAL Probolinggo.",
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
    <div className="flex flex-col gap-6">
      <h1 className="text-3xl font-semibold tracking-tight">
        {topicLabel(topic ? [topic] : null, "struktur", "Struktur")} Organisasi
      </h1>

      {!structure || structure.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            Data struktur organisasi belum tersedia.
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {structure.map((person) => (
            <Card key={person.id}>
              <CardContent className="flex flex-col items-center gap-2 text-center">
                {person.foto_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={person.foto_url}
                    alt={person.nama}
                    className="size-20 rounded-full object-cover"
                  />
                ) : (
                  <div
                    aria-hidden="true"
                    className="flex size-20 items-center justify-center rounded-full bg-muted text-lg font-medium"
                  >
                    {person.nama.charAt(0)}
                  </div>
                )}
                <div>
                  <p className="font-medium">{person.nama}</p>
                  <p className="text-sm text-muted-foreground">
                    {person.jabatan}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
