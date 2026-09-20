import type { Metadata } from "next";
import Link from "next/link";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database.types";
import { createPublicClient } from "@/lib/supabase/public";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Reveal } from "@/components/shared/reveal";
import { HimasalLogo } from "@/components/shared/himasal-logo";
import { HeroCarousel } from "@/components/public/hero-carousel";

export const metadata: Metadata = {
  title: "Beranda",
  description:
    "Website resmi Himpunan Alumni Santri Lirboyo (HIMASAL) Probolinggo.",
};

// Beranda selalu dirender fresh per-request (bukan ISR statis) supaya
// wallpaper Hero Carousel dari CMS langsung tampil begitu Admin
// mengaktifkannya, tanpa menunggu revalidasi apa pun.
export const dynamic = "force-dynamic";

export default async function BerandaPage() {
  const supabase = createPublicClient();

  // Klien khusus untuk hero_slides: fetch dipaksa "no-store" di level HTTP
  // (bukan hanya lewat konfigurasi revalidate halaman) supaya query ini
  // tidak pernah terjebak di lapisan cache mana pun. Klien createPublicClient()
  // di atas TIDAK diubah - dipakai persis seperti sebelumnya untuk
  // profil/statistik/masayikh.
  const heroSlidesClient = createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: {
        fetch: (input, init) => fetch(input, { ...init, cache: "no-store" }),
      },
    },
  );

  const [
    { data: profile },
    { data: stats },
    { data: masayikhList },
    { data: heroSlides, error: heroSlidesError },
  ] = await Promise.all([
    supabase.from("organization_profile").select("deskripsi").single(),
    supabase.rpc("public_stats").single(),
    supabase
      .from("masayikh")
      .select("id, nama, foto_url, deskripsi")
      .eq("is_active", true)
      .order("display_order")
      .limit(3),
    heroSlidesClient
      .from("hero_slides")
      .select("id, image_url, alt_text")
      .eq("is_active", true)
      .order("display_order"),
  ]);

  if (heroSlidesError) {
    // Log server-side saja (muncul di Cloudflare Worker logs) supaya
    // penyebab asli terlihat kalau query ini pernah gagal, tanpa
    // menampilkan apa pun ke pengunjung - hero tetap fallback ke
    // background gradient premium seperti biasa.
    console.error("[beranda] gagal memuat hero_slides:", heroSlidesError.message);
  }

  return (
    <div className="flex flex-col gap-16">
      {/* Hero */}
      <section className="hero-premium-bg relative flex flex-col items-center gap-6 overflow-hidden rounded-2xl py-16 text-center">
        <HeroCarousel slides={heroSlides ?? []} />
        <div className="relative z-10 flex flex-col items-center gap-6">
          <HimasalLogo heightClassName="h-20" plate />
          <div className="flex flex-col items-center gap-3">
            <span className="h-1 w-10 rounded-full bg-brand-gold" aria-hidden="true" />
            <h1 className="text-3xl font-bold tracking-tight text-balance text-white sm:text-5xl">
              Himpunan Alumni Santri Lirboyo Probolinggo
            </h1>
          </div>
          <p className="max-w-xl text-balance text-white/75 sm:text-lg">
            Merajut silaturahmi dan mengabdi bersama para alumni Pondok
            Pesantren Lirboyo di wilayah Probolinggo.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Button asChild size="lg">
              <Link href="/login">Masuk ke Akun</Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="border-white/30 bg-white/5 text-white hover:bg-white/15 hover:text-white"
            >
              <Link href="/profil">Tentang HIMASAL</Link>
            </Button>
          </div>
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
