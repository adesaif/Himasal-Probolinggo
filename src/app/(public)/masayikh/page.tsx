import type { Metadata } from "next";

import { createPublicClient } from "@/lib/supabase/public";
import { Card, CardContent } from "@/components/ui/card";
import { topicLabel } from "@/lib/topics";

export const metadata: Metadata = {
  title: "Masayikh",
  description: "Profil para masyayikh Pondok Pesantren Lirboyo.",
};

export const revalidate = 300;

export default async function MasayikhPage() {
  const supabase = createPublicClient();
  const [{ data: masayikhList }, { data: topic }] = await Promise.all([
    supabase
      .from("masayikh")
      .select("id, nama, foto_url, deskripsi")
      .eq("is_active", true)
      .order("display_order"),
    supabase.from("site_topics").select("key, label").eq("key", "masayikh").maybeSingle(),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-3xl font-semibold tracking-tight">
        {topicLabel(topic ? [topic] : null, "masayikh", "Masayikh")}
      </h1>

      {!masayikhList || masayikhList.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            Data masayikh belum tersedia.
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {masayikhList.map((m) => (
            <Card key={m.id}>
              <CardContent className="flex flex-col items-center gap-3 text-center">
                {m.foto_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={m.foto_url}
                    alt={m.nama}
                    className="size-24 rounded-full object-cover"
                  />
                ) : (
                  <div
                    aria-hidden="true"
                    className="flex size-24 items-center justify-center rounded-full bg-muted text-xl font-medium"
                  >
                    {m.nama.charAt(0)}
                  </div>
                )}
                <div>
                  <p className="font-medium">{m.nama}</p>
                  {m.deskripsi ? (
                    <p className="mt-1 text-sm text-muted-foreground">
                      {m.deskripsi}
                    </p>
                  ) : null}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
