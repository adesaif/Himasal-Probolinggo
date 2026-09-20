import type { Metadata } from "next";
import Link from "next/link";

import { createPublicClient } from "@/lib/supabase/public";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Reveal } from "@/components/shared/reveal";
import { HeroCarousel } from "@/components/public/hero-carousel";
import { formatDateID } from "@/lib/format-date";

export const metadata: Metadata = {
  title: "Beranda",
  description:
    "Website resmi Himpunan Alumni Santri Lirboyo (HIMASAL) Probolinggo.",
};

// Beranda selalu dirender fresh per-request (bukan ISR statis) supaya
// berita/kategori dari CMS Admin langsung tampil tanpa menunggu revalidasi.
export const dynamic = "force-dynamic";

type CategorySection = {
  id: string;
  name: string;
  slug: string;
  tagline: string | null;
  items: {
    id: string;
    slug: string;
    title: string;
    thumbnail_url: string | null;
    published_at: string | null;
  }[];
};

export default async function BerandaPage() {
  const supabase = createPublicClient();

  const [
    { data: profile },
    { data: masayikhList },
    { data: heroNews, error: heroNewsError },
    { data: categoryNewsRows, error: categoryNewsError },
  ] = await Promise.all([
    supabase.from("organization_profile").select("deskripsi").single(),
    supabase
      .from("masayikh")
      .select("id, nama, foto_url, deskripsi")
      .eq("is_active", true)
      .order("display_order")
      .limit(3),
    // Hero portal berita: berita Unggulan (is_featured), published, dan
    // punya thumbnail - foto + judul asli dari Admin, tidak di-hardcode.
    supabase
      .from("news")
      .select("id, slug, title, thumbnail_url")
      .eq("status", "published")
      .eq("is_featured", true)
      .not("thumbnail_url", "is", null)
      .order("published_at", { ascending: false })
      .limit(6),
    // Kategori dinamis: RPC mengembalikan N berita terbaru per kategori
    // aktif+tampil-di-beranda, dikelola penuh oleh Admin lewat
    // /admin/konten/kategori - tidak ada kategori yang di-hardcode.
    supabase.rpc("public_homepage_news_by_category", {
      p_limit_per_category: 4,
    }),
  ]);

  if (heroNewsError) {
    console.error("[beranda] gagal memuat berita unggulan untuk hero:", heroNewsError.message);
  }
  if (categoryNewsError) {
    console.error("[beranda] gagal memuat kategori:", categoryNewsError.message);
  }

  const categorySections: CategorySection[] = [];
  const sectionByCategoryId = new Map<string, CategorySection>();
  for (const row of categoryNewsRows ?? []) {
    let section = sectionByCategoryId.get(row.category_id);
    if (!section) {
      section = {
        id: row.category_id,
        name: row.category_name,
        slug: row.category_slug,
        tagline: row.category_tagline,
        items: [],
      };
      sectionByCategoryId.set(row.category_id, section);
      categorySections.push(section);
    }
    section.items.push({
      id: row.news_id,
      slug: row.news_slug,
      title: row.news_title,
      thumbnail_url: row.news_thumbnail_url,
      published_at: row.news_published_at,
    });
  }

  const heroSlides = (heroNews ?? []).filter(
    (n): n is { id: string; slug: string; title: string; thumbnail_url: string } =>
      Boolean(n.thumbnail_url),
  );

  return (
    <div className="flex flex-col gap-16">
      {/* Hero: portal berita - foto + judul asli berita Unggulan */}
      <section className="hero-premium-bg relative z-0 h-[380px] overflow-hidden rounded-2xl sm:h-[460px] lg:h-[520px]">
        <HeroCarousel slides={heroSlides} />
      </section>

      {/* Kategori Berita - dinamis, dikelola penuh oleh Admin lewat
          /admin/konten/kategori. Tidak ada kategori yang di-hardcode. */}
      {categorySections.map((cat) => (
        <Reveal key={cat.id}>
          <section>
            <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 className="text-2xl font-semibold tracking-tight">{cat.name}</h2>
                {cat.tagline ? (
                  <p className="mt-1 text-sm text-muted-foreground">{cat.tagline}</p>
                ) : null}
              </div>
              <Button asChild variant="link" className="shrink-0">
                <Link href={`/berita?category=${cat.slug}`}>Lihat semua →</Link>
              </Button>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {cat.items.map((item) => (
                <Link key={item.id} href={`/berita/${item.slug}`}>
                  <Card className="card-hover h-full overflow-hidden">
                    {item.thumbnail_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={item.thumbnail_url}
                        alt={item.title}
                        loading="lazy"
                        className="aspect-video w-full object-cover"
                      />
                    ) : (
                      <div className="flex aspect-video w-full items-center justify-center bg-muted text-sm text-muted-foreground">
                        Tidak ada gambar
                      </div>
                    )}
                    <CardContent className="flex flex-col gap-1">
                      <p className="line-clamp-2 font-medium">{item.title}</p>
                      {item.published_at ? (
                        <p className="text-xs text-muted-foreground">
                          {formatDateID(item.published_at)}
                        </p>
                      ) : null}
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </section>
        </Reveal>
      ))}

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
    </div>
  );
}
