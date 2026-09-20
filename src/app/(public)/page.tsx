import type { Metadata } from "next";
import Link from "next/link";

import { createPublicClient } from "@/lib/supabase/public";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Reveal } from "@/components/shared/reveal";
import { HeroCarousel, type HeroSlide } from "@/components/public/hero-carousel";
import { formatDateID } from "@/lib/format-date";
import { TOPIC_SELECT_COLUMNS, isTopicActive, isTopicFeaturedAllowed } from "@/lib/topics";

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
    { data: heroEvents, error: heroEventsError },
    { data: categoryNewsRows, error: categoryNewsError },
    { data: topics },
  ] = await Promise.all([
    supabase.from("organization_profile").select("deskripsi").single(),
    supabase
      .from("masayikh")
      .select("id, nama, foto_url, deskripsi")
      .eq("is_active", true)
      .order("display_order")
      .limit(3),
    // Kandidat hero dari Berita: berita Unggulan (is_featured), published,
    // punya thumbnail. Ikut tampil di Hero HANYA jika topik Berita
    // mengizinkan Unggulan (site_topics.allow_featured) - lihat gating di
    // bawah. Judul/foto asli dari Admin, tidak di-hardcode.
    supabase
      .from("news")
      .select("id, slug, title, thumbnail_url, published_at")
      .eq("status", "published")
      .eq("is_featured", true)
      .not("thumbnail_url", "is", null)
      .order("published_at", { ascending: false })
      .limit(6),
    // Kandidat hero dari Agenda - sama seperti Berita, ikut tampil HANYA
    // jika topik Agenda mengizinkan Unggulan.
    supabase
      .from("events")
      .select("id, title, thumbnail_url, start_at")
      .eq("status", "published")
      .eq("is_featured", true)
      .not("thumbnail_url", "is", null)
      .order("start_at", { ascending: false })
      .limit(6),
    // Kategori dinamis: RPC mengembalikan N berita terbaru per kategori
    // aktif+tampil-di-beranda, dikelola penuh oleh Admin lewat
    // /admin/konten/kategori - tidak ada kategori yang di-hardcode.
    supabase.rpc("public_homepage_news_by_category", {
      p_limit_per_category: 4,
    }),
    // Topik: nama, status aktif, dan izin Unggulan tiap bagian website,
    // dikelola Admin lewat /admin/konten/topik.
    supabase.from("site_topics").select(TOPIC_SELECT_COLUMNS),
  ]);

  if (heroNewsError) {
    console.error("[beranda] gagal memuat berita unggulan untuk hero:", heroNewsError.message);
  }
  if (heroEventsError) {
    console.error("[beranda] gagal memuat agenda unggulan untuk hero:", heroEventsError.message);
  }
  if (categoryNewsError) {
    console.error("[beranda] gagal memuat kategori:", categoryNewsError.message);
  }

  const beritaActive = isTopicActive(topics, "berita");
  const profilActive = isTopicActive(topics, "profil");
  const masayikhActive = isTopicActive(topics, "masayikh");

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

  // Hero Carousel menggabungkan kandidat Berita + Agenda, tapi HANYA yang
  // topiknya aktif dan mengizinkan Unggulan (site_topics.allow_featured).
  // "Unggulan ON" di topik tidak berarti semua kontennya otomatis tampil -
  // konten itu sendiri tetap harus is_featured=true (sudah difilter di
  // query di atas). Diurutkan gabungan berdasarkan tanggal, dibatasi 6.
  const heroFromNews: (HeroSlide & { sortDate: string })[] = isTopicFeaturedAllowed(
    topics,
    "berita",
  )
    ? (heroNews ?? [])
        .filter((n): n is typeof n & { thumbnail_url: string } => Boolean(n.thumbnail_url))
        .map((n) => ({
          id: `news-${n.id}`,
          href: `/berita/${n.slug}`,
          title: n.title,
          thumbnail_url: n.thumbnail_url,
          sortDate: n.published_at ?? "",
        }))
    : [];

  const heroFromEvents: (HeroSlide & { sortDate: string })[] = isTopicFeaturedAllowed(
    topics,
    "agenda",
  )
    ? (heroEvents ?? [])
        .filter((e): e is typeof e & { thumbnail_url: string } => Boolean(e.thumbnail_url))
        .map((e) => ({
          id: `event-${e.id}`,
          href: `/agenda/${e.id}`,
          title: e.title,
          thumbnail_url: e.thumbnail_url,
          sortDate: e.start_at ?? "",
        }))
    : [];

  const heroSlides = [...heroFromNews, ...heroFromEvents]
    .sort((a, b) => (a.sortDate < b.sortDate ? 1 : -1))
    .slice(0, 6);

  return (
    <div className="flex flex-col gap-16">
      {/* Hero: portal berita - foto + judul asli berita Unggulan */}
      <section className="hero-premium-bg relative z-0 h-[380px] overflow-hidden rounded-2xl sm:h-[460px] lg:h-[520px]">
        <HeroCarousel slides={heroSlides} />
      </section>

      {/* Kategori Berita - dinamis, dikelola penuh oleh Admin lewat
          /admin/konten/kategori. Tidak ada kategori yang di-hardcode.
          Seluruh section ini juga ikut disembunyikan kalau topik Berita
          dinonaktifkan lewat /admin/konten/topik. */}
      {beritaActive && categorySections.map((cat) => (
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

      {/* Tentang - ikut disembunyikan kalau topik Profil dinonaktifkan. */}
      {profilActive ? (
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
      ) : null}

      {/* Preview Masayikh - ikut disembunyikan kalau topik Masayikh
          dinonaktifkan. */}
      {masayikhActive ? (
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
      ) : null}
    </div>
  );
}
