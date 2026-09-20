import type { Metadata } from "next";
import Link from "next/link";

import { createPublicClient } from "@/lib/supabase/public";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Reveal } from "@/components/shared/reveal";
import { HimasalLogo } from "@/components/shared/himasal-logo";

export const metadata: Metadata = {
  title: "Beranda",
  description:
    "Website resmi Himpunan Alumni Santri Lirboyo (HIMASAL) Probolinggo.",
};

export const revalidate = 300;

export default async function BerandaPage() {
  const supabase = createPublicClient();

  const [{ data: profile }, { data: stats }, { data: masayikhList }] =
    await Promise.all([
      supabase.from("organization_profile").select("deskripsi").single(),
      supabase.rpc("public_stats").single(),
      supabase
        .from("masayikh")
        .select("id, nama, foto_url, deskripsi")
        .eq("is_active", true)
        .order("display_order")
        .limit(3),
    ]);

  return (
    <div className="flex flex-col gap-16">
      {/* Hero */}
      <section className="flex flex-col items-center gap-6 py-16 text-center">
        <HimasalLogo heightClassName="h-20" plate />
        <div className="flex flex-col items-center gap-3">
          <span className="h-1 w-10 rounded-full bg-brand-gold" aria-hidden="true" />
          <h1 className="text-3xl font-bold tracking-tight text-balance sm:text-5xl">
            Himpunan Alumni Santri Lirboyo Probolinggo
          </h1>
        </div>
        <p className="max-w-xl text-balance text-muted-foreground sm:text-lg">
          Merajut silaturahmi dan mengabdi bersama para alumni Pondok
          Pesantren Lirboyo di wilayah Probolinggo.
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <Button asChild size="lg">
            <Link href="/login">Masuk ke Akun</Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link href="/profil">Tentang HIMASAL</Link>
          </Button>
        </div>
      </section>

      {/* Tentang */}
      <Reveal>
        <section className="grid grid-cols-1 gap-6 sm:grid-cols-2 sm:items-center">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">
              Tentang HIMASAL
            </h2>
            <p className="mt-3 text-muted-foreground">
              {profile?.deskripsi ||
                "Konten ringkasan organisasi sedang disiapkan oleh Admin."}
            </p>
            <Button asChild variant="link" className="mt-2 px-0">
              <Link href="/profil">Selengkapnya →</Link>
            </Button>
          </div>
        </section>
      </Reveal>

      {/* Statistik */}
      {stats && (stats.total_alumni_aktif > 0 || stats.total_wilayah > 0) ? (
        <Reveal>
          <section className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Card className="card-hover border-primary/10">
              <CardContent className="text-center">
                <p className="text-3xl font-semibold tracking-tight text-primary">
                  {stats.total_alumni_aktif}
                </p>
                <p className="text-sm text-muted-foreground">Alumni Aktif</p>
              </CardContent>
            </Card>
            <Card className="card-hover border-primary/10">
              <CardContent className="text-center">
                <p className="text-3xl font-semibold tracking-tight text-primary">
                  {stats.total_wilayah}
                </p>
                <p className="text-sm text-muted-foreground">Wilayah</p>
              </CardContent>
            </Card>
          </section>
        </Reveal>
      ) : null}

      {/* Preview Masayikh */}
      <Reveal>
        <section>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-2xl font-semibold tracking-tight">Masayikh</h2>
            <Button asChild variant="link">
              <Link href="/masayikh">Lihat semua →</Link>
            </Button>
          </div>
          {!masayikhList || masayikhList.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Data masayikh belum tersedia.
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              {masayikhList.map((m) => (
                <Card key={m.id} className="card-hover">
                  <CardContent className="flex flex-col items-center gap-2 text-center">
                    {m.foto_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={m.foto_url}
                        alt={m.nama}
                        className="size-20 rounded-full object-cover"
                      />
                    ) : (
                      <div className="flex size-20 items-center justify-center rounded-full bg-muted text-lg font-medium">
                        {m.nama.charAt(0)}
                      </div>
                    )}
                    <p className="font-medium">{m.nama}</p>
                    {m.deskripsi ? (
                      <p className="line-clamp-2 text-xs text-muted-foreground">
                        {m.deskripsi}
                      </p>
                    ) : null}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </section>
      </Reveal>

      {/* CTA */}
      <Reveal>
        <section className="rounded-xl border bg-secondary/50 p-8 text-center sm:p-12">
          <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">
            Sudah terdaftar sebagai alumni?
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Masuk untuk melihat profil, agenda, dan informasi terbaru.
          </p>
          <Button asChild className="mt-4">
            <Link href="/login">Masuk ke Akun</Link>
          </Button>
        </section>
      </Reveal>
    </div>
  );
}
