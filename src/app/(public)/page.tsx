import type { Metadata } from "next";
import Link from "next/link";

import { createPublicClient } from "@/lib/supabase/public";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Reveal } from "@/components/shared/reveal";
import { HeroCarousel, type HeroSlide } from "@/components/public/hero-carousel";
import { formatDateID } from "@/lib/format-date";
import { TOPIC_SELECT_COLUMNS, isTopicActive, isTopicFeaturedAllowed, topicLabel } from "@/lib/topics";

export const metadata: Metadata = {
  title: "Beranda",
  description:
    "Website resmi Himpunan Alumni Santri Lirboyo (HIMASAL) Probolinggo.",
};

// Beranda selalu dirender fresh per-request (bukan ISR statis) supaya
// berita/konten dari CMS Admin langsung tampil tanpa menunggu revalidasi.
export const dynamic = "force-dynamic";

const NEWS_CARD_COLUMNS = "id, slug, title, thumbnail_url, published_at";

type NewsCard = {
  id: string;
  slug: string;
  title: string;
  thumbnail_url: string | null;
  published_at: string | null;
};

function daysAgoIso(days: number): string {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
}

function NewsGrid({ items }: { items: NewsCard[] }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {items.map((item) => (
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
  );
}

function NewsSection({ heading, items }: { heading: string; items: NewsCard[] }) {
  if (items.length === 0) return null;
  return (
    <Reveal>
      <section>
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <h2 className="text-2xl font-semibold tracking-tight">{heading}</h2>
          <Button asChild variant="link" className="shrink-0">
            <Link href="/berita">Lihat semua →</Link>
          </Button>
        </div>
        <NewsGrid items={items} />
      </section>
    </Reveal>
  );
}

export default async function BerandaPage() {
  const supabase = createPublicClient();

  const [
    { data: profile },
    { data: masayikhList },
    { data: heroNews, error: heroNewsError },
    { data: heroEvents, error: heroEventsError },
    { data: heroGaleri, error: heroGaleriError },
    { data: heroStruktur, error: heroStrukturError },
    { data: heroMasayikh, error: heroMasayikhError },
    { data: terbaruRows, error: terbaruError },
    { data: mingguCandidates, error: mingguError },
    { data: bulanCandidates, error: bulanError },
    { data: topics },
  ] = await Promise.all([
    supabase
      .from("organization_profile")
      .select("deskripsi, image_url, is_featured, updated_at")
      .single(),
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
    // Kandidat hero dari Galeri Unggulan.
    supabase
      .from("gallery_items")
      .select("id, image_url, caption, created_at")
      .eq("is_published", true)
      .eq("is_featured", true)
      .order("created_at", { ascending: false })
      .limit(6),
    // Kandidat hero dari Struktur (pengurus) Unggulan.
    supabase
      .from("organization_structure")
      .select("id, nama, jabatan, foto_url, created_at")
      .eq("is_active", true)
      .eq("is_featured", true)
      .not("foto_url", "is", null)
      .order("created_at", { ascending: false })
      .limit(6),
    // Kandidat hero dari Masayikh Unggulan (independen dari daftar
    // preview 3 di atas - masayikh Unggulan tetap ikut hero walau bukan
    // 3 teratas berdasarkan display_order).
    supabase
      .from("masayikh")
      .select("id, nama, foto_url, created_at")
      .eq("is_active", true)
      .eq("is_featured", true)
      .not("foto_url", "is", null)
      .order("created_at", { ascending: false })
      .limit(6),
    // Berita Terbaru: published, published_at not null, DESC, max 4.
    // Tidak butuh kategori, tidak butuh "tampilkan di beranda" - publish
    // saja otomatis masuk sini sesuai tanggal.
    supabase
      .from("news")
      .select(NEWS_CARD_COLUMNS)
      .eq("status", "published")
      .not("published_at", "is", null)
      .order("published_at", { ascending: false })
      .limit(4),
    // Berita Satu Minggu Lalu: published_at 7-14 hari lalu (bukan
    // berdasarkan nomor/index artikel). Ambil kandidat lebih banyak dari
    // limit tampil (4) supaya setelah exclude duplikat dgn Terbaru masih
    // cukup untuk mengisi 4 slot.
    supabase
      .from("news")
      .select(NEWS_CARD_COLUMNS)
      .eq("status", "published")
      .not("published_at", "is", null)
      .lt("published_at", daysAgoIso(7))
      .gte("published_at", daysAgoIso(14))
      .order("published_at", { ascending: false })
      .limit(8),
    // Berita Satu Bulan Lalu: published_at 30-60 hari lalu.
    supabase
      .from("news")
      .select(NEWS_CARD_COLUMNS)
      .eq("status", "published")
      .not("published_at", "is", null)
      .lt("published_at", daysAgoIso(30))
      .gte("published_at", daysAgoIso(60))
      .order("published_at", { ascending: false })
      .limit(8),
    // Topik: nama, status aktif, dan izin Unggulan tiap bagian website,
    // dikelola Admin lewat /admin/konten/topik. Satu source of truth
    // untuk label yang dipakai di nav, footer, sidebar Admin, dan heading
    // section homepage di bawah.
    supabase.from("site_topics").select(TOPIC_SELECT_COLUMNS),
  ]);

  if (heroNewsError) {
    console.error("[beranda] gagal memuat berita unggulan untuk hero:", heroNewsError.message);
  }
  if (heroEventsError) {
    console.error("[beranda] gagal memuat agenda unggulan untuk hero:", heroEventsError.message);
  }
  if (heroGaleriError) {
    console.error("[beranda] gagal memuat galeri unggulan untuk hero:", heroGaleriError.message);
  }
  if (heroStrukturError) {
    console.error("[beranda] gagal memuat struktur unggulan untuk hero:", heroStrukturError.message);
  }
  if (heroMasayikhError) {
    console.error("[beranda] gagal memuat masayikh unggulan untuk hero:", heroMasayikhError.message);
  }
  if (terbaruError) {
    console.error("[beranda] gagal memuat berita terbaru:", terbaruError.message);
  }
  if (mingguError) {
    console.error("[beranda] gagal memuat berita satu minggu lalu:", mingguError.message);
  }
  if (bulanError) {
    console.error("[beranda] gagal memuat berita satu bulan lalu:", bulanError.message);
  }

  const beritaActive = isTopicActive(topics, "berita");
  const profilActive = isTopicActive(topics, "profil");
  const masayikhActive = isTopicActive(topics, "masayikh");
  const beritaLabel = topicLabel(topics, "berita", "Berita");
  const masayikhLabel = topicLabel(topics, "masayikh", "Masayikh");

  // Tiga section berita berbasis published_at, saling eksklusif (id yang
  // sudah dipakai section sebelumnya di-exclude), bukan berbasis
  // index/nomor artikel - lihat query di atas.
  const terbaru: NewsCard[] = terbaruRows ?? [];
  const terbaruIds = new Set(terbaru.map((n) => n.id));
  const mingguLalu: NewsCard[] = (mingguCandidates ?? [])
    .filter((n) => !terbaruIds.has(n.id))
    .slice(0, 4);
  const mingguIds = new Set(mingguLalu.map((n) => n.id));
  const bulanLalu: NewsCard[] = (bulanCandidates ?? [])
    .filter((n) => !terbaruIds.has(n.id) && !mingguIds.has(n.id))
    .slice(0, 4);

  // Hero Carousel menggabungkan kandidat dari SEMUA topik yang punya
  // konten Unggulan nyata (Berita, Agenda, Galeri, Struktur, Masayikh,
  // Profil), tapi HANYA yang topiknya aktif DAN mengizinkan Unggulan
  // (site_topics.allow_featured). "Unggulan ON" di topik tidak berarti
  // semua kontennya otomatis tampil - konten itu sendiri tetap harus
  // is_featured=true (sudah difilter di query di atas). Diurutkan
  // gabungan berdasarkan tanggal, dibatasi 6. Tidak pernah dummy slide -
  // kalau semua kosong, HeroCarousel return null.
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

  const heroFromGaleri: (HeroSlide & { sortDate: string })[] = isTopicFeaturedAllowed(
    topics,
    "galeri",
  )
    ? (heroGaleri ?? []).map((g) => ({
        id: `galeri-${g.id}`,
        href: "/galeri",
        title: g.caption || `${topicLabel(topics, "galeri", "Galeri")} HIMASAL Probolinggo`,
        thumbnail_url: g.image_url,
        sortDate: g.created_at,
      }))
    : [];

  const heroFromStruktur: (HeroSlide & { sortDate: string })[] = isTopicFeaturedAllowed(
    topics,
    "struktur",
  )
    ? (heroStruktur ?? [])
        .filter((s): s is typeof s & { foto_url: string } => Boolean(s.foto_url))
        .map((s) => ({
          id: `struktur-${s.id}`,
          href: "/struktur",
          title: `${s.nama} - ${s.jabatan}`,
          thumbnail_url: s.foto_url,
          sortDate: s.created_at,
        }))
    : [];

  const heroFromMasayikh: (HeroSlide & { sortDate: string })[] = isTopicFeaturedAllowed(
    topics,
    "masayikh",
  )
    ? (heroMasayikh ?? [])
        .filter((m): m is typeof m & { foto_url: string } => Boolean(m.foto_url))
        .map((m) => ({
          id: `masayikh-${m.id}`,
          href: "/masayikh",
          title: m.nama,
          thumbnail_url: m.foto_url,
          sortDate: m.created_at,
        }))
    : [];

  const heroFromProfil: (HeroSlide & { sortDate: string })[] =
    isTopicFeaturedAllowed(topics, "profil") && profile?.is_featured && profile.image_url
      ? [
          {
            id: "profil",
            href: "/profil",
            title: `${topicLabel(topics, "profil", "Profil")} HIMASAL Probolinggo`,
            thumbnail_url: profile.image_url,
            sortDate: profile.updated_at,
          },
        ]
      : [];

  const heroSlides = [
    ...heroFromNews,
    ...heroFromEvents,
    ...heroFromGaleri,
    ...heroFromStruktur,
    ...heroFromMasayikh,
    ...heroFromProfil,
  ]
    .sort((a, b) => (a.sortDate < b.sortDate ? 1 : -1))
    .slice(0, 6);

  return (
    <div className="flex flex-col gap-16">
      {/* Hero: portal konten - foto + judul asli dari Berita/Agenda
          Unggulan. Kalau tidak ada konten unggulan, HeroCarousel return
          null dan section ini jatuh ke background gradient premium saja -
          tidak pernah menampilkan dummy slide. */}
      <section className="hero-premium-bg relative z-0 h-[340px] overflow-hidden rounded-2xl sm:h-[400px] lg:h-[440px]">
        <HeroCarousel slides={heroSlides} />
      </section>

      {/* Tiga section Berita berbasis tanggal publish - published =
          otomatis masuk sesuai aturan tanggal, Admin tidak perlu memilih
          "tampilkan di beranda". Kategori bukan syarat tampil. Seluruh
          section ini disembunyikan kalau topik Berita dinonaktifkan, dan
          tiap section individual disembunyikan kalau kosong. */}
      {beritaActive ? (
        <>
          <NewsSection heading={`${beritaLabel} Terbaru`} items={terbaru} />
          <NewsSection heading={`${beritaLabel} Satu Minggu Lalu`} items={mingguLalu} />
          <NewsSection heading={`${beritaLabel} Satu Bulan Lalu`} items={bulanLalu} />
        </>
      ) : null}

      {/* Tentang HIMASAL - hanya tampil kalau topik Profil aktif DAN
          organization_profile.deskripsi benar-benar berisi konten nyata.
          Tidak ada placeholder/fallback publik. */}
      {profilActive && profile?.deskripsi ? (
        <Reveal>
          <section className="grid grid-cols-1 gap-6 sm:grid-cols-2 sm:items-center">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight">
                Tentang HIMASAL
              </h2>
              <p className="mt-3 text-muted-foreground">{profile.deskripsi}</p>
              <Button asChild variant="link" className="mt-2 px-0">
                <Link href="/profil">Selengkapnya →</Link>
              </Button>
            </div>
          </section>
        </Reveal>
      ) : null}

      {/* Preview Masayikh - hanya tampil kalau topik aktif DAN ada
          minimal satu data masayikh aktif. Tidak ada pesan placeholder -
          section disembunyikan total kalau kosong. */}
      {masayikhActive && masayikhList && masayikhList.length > 0 ? (
        <Reveal>
          <section>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-2xl font-semibold tracking-tight">{masayikhLabel}</h2>
              <Button asChild variant="link">
                <Link href="/masayikh">Lihat semua →</Link>
              </Button>
            </div>
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
          </section>
        </Reveal>
      ) : null}
    </div>
  );
}
