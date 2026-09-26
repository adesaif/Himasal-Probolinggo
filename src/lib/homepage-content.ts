import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database.types";
import type { HeroSlide } from "@/components/public/scroll-morph-hero";
import { formatCardDateTimeID, formatDateID } from "@/lib/format-date";
import { isTopicFeaturedAllowed, topicHref, type SiteTopic } from "@/lib/topics";

type PublicSupabase = SupabaseClient<Database>;

export type HomeCardItem = {
  id: string;
  href: string;
  title: string;
  // Ringkasan singkat (excerpt/deskripsi/jabatan tergantung sumber data) -
  // dirender di bawah judul kalau tersedia, disembunyikan kalau tidak.
  summary?: string | null;
  // Tanggal+jam terformat (mis. dari published_at) - baris paling bawah
  // card, disembunyikan total kalau konten tidak punya tanggal publikasi.
  dateLabel?: string | null;
  image_url?: string | null;
};

export type HomeSection =
  | {
      kind: "cards";
      topicKey: string;
      heading: string;
      // Label topik dari site_topics untuk badge kecil di setiap card
      // section ini - sama untuk semua item (satu section = satu topik).
      topicLabel: string;
      viewAllHref: string;
      items: HomeCardItem[];
    }
  | {
      kind: "text";
      topicKey: string;
      heading: string;
      body: string | null;
      viewAllHref: string;
    };

export type HeroCandidate = HeroSlide & { sortDate: string };

type SectionFetchResult = {
  section: HomeSection;
  heroCandidates: HeroCandidate[];
};

type SystemFetcher = (supabase: PublicSupabase, topic: SiteTopic) => Promise<SectionFetchResult>;

const CARD_LIMIT = 4;
// Hero sekarang Scroll Morph (banyak kartu sekaligus, lihat
// scroll-morph-hero.tsx) - kandidat per sumber & total dinaikkan supaya ring/
// arc punya cukup konten nyata. Tetap dibatasi: kartu di panggung maksimal 20.
const HERO_CANDIDATE_LIMIT = 20;
const HERO_SLIDE_LIMIT = 20;

const NEWS_CARD_COLUMNS = "id, slug, title, excerpt, thumbnail_url, published_at";

type NewsCardRow = {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  thumbnail_url: string | null;
  published_at: string | null;
};

type NewsHeroRow = NewsCardRow;

function newsRowToCardItem(n: NewsCardRow): HomeCardItem {
  return {
    id: n.id,
    href: `/berita/${n.slug}`,
    title: n.title,
    summary: n.excerpt,
    dateLabel: n.published_at ? formatCardDateTimeID(n.published_at) : null,
    image_url: n.thumbnail_url,
  };
}

/**
 * Berita yang Topik-nya di-set ke topik LAIN (bukan Berita) oleh Admin -
 * dipanggil dari fetchHomeSections untuk setiap topik non-Berita, supaya
 * artikel tersebut muncul di section topik pilihannya (bukan di Berita
 * Terbaru) dan Hero eligibility-nya ikut allow_featured topik itu. Ini
 * PERSIS query yang sama dengan fetchBeritaSections, hanya topic.id-nya
 * beda - Berita tetap satu-satunya sumber data (tabel `news`), topic_id
 * yang menentukan section mana yang memilikinya.
 */
async function fetchTopicNews(
  supabase: PublicSupabase,
  topic: SiteTopic,
): Promise<{ items: HomeCardItem[]; heroCandidates: HeroCandidate[] }> {
  const [{ data: rows }, { data: featuredRows }] = await Promise.all([
    supabase
      .from("news")
      .select(NEWS_CARD_COLUMNS)
      .eq("status", "published")
      .eq("topic_id", topic.id)
      .not("published_at", "is", null)
      .order("published_at", { ascending: false })
      .limit(CARD_LIMIT),
    isTopicFeaturedAllowed([topic], topic.key)
      ? supabase
          .from("news")
          .select("id, slug, title, thumbnail_url, published_at, excerpt")
          .eq("status", "published")
          .eq("topic_id", topic.id)
          .eq("is_featured", true)
          .not("thumbnail_url", "is", null)
          .order("published_at", { ascending: false })
          .limit(HERO_CANDIDATE_LIMIT)
      : Promise.resolve({ data: [] as never[] }),
  ]);

  const items: HomeCardItem[] = (rows ?? []).map(newsRowToCardItem);

  const heroCandidates: HeroCandidate[] = (featuredRows ?? [])
    .filter((n): n is NewsHeroRow & { thumbnail_url: string } => Boolean(n.thumbnail_url))
    .map((n) => ({
      id: `news-${n.id}`,
      href: `/berita/${n.slug}`,
      title: n.title,
      thumbnail_url: n.thumbnail_url,
      category: topic.label,
      summary: n.excerpt,
      sortDate: n.published_at ?? "",
    }));

  return { items, heroCandidates };
}

/**
 * Registry topik sistem (backed tabel konten khusus) -> cara mengambil
 * section homepage + kandidat hero-nya. "berita" SENGAJA tidak ada di sini -
 * lihat fetchBeritaSections di atas, dipanggil terpisah karena punya 3
 * section tetap (bukan satu section generik). Topik yang tidak ada di
 * registry ini (Konten dan topik custom apa pun buatan Admin) otomatis
 * jatuh ke `fetchGenericSection` di bawah - supaya topik baru bisa muncul
 * di Beranda tanpa menambah entry baru di sini atau JSX section baru.
 */
const SYSTEM_FETCHERS: Record<string, SystemFetcher> = {
  agenda: async (supabase, topic) => {
    const [{ data: rows }, { data: featuredRows }] = await Promise.all([
      supabase
        .from("events")
        .select("id, title, description, thumbnail_url, start_at")
        .eq("status", "published")
        .order("start_at", { ascending: false })
        .limit(CARD_LIMIT),
      isTopicFeaturedAllowed([topic], topic.key)
        ? supabase
            .from("events")
            .select("id, title, thumbnail_url, start_at, description")
            .eq("status", "published")
            .eq("is_featured", true)
            .not("thumbnail_url", "is", null)
            .order("start_at", { ascending: false })
            .limit(HERO_CANDIDATE_LIMIT)
        : Promise.resolve({ data: [] as never[] }),
    ]);

    const items: HomeCardItem[] = (rows ?? []).map((e) => ({
      id: e.id,
      href: `/agenda/${e.id}`,
      title: e.title,
      summary: e.description,
      dateLabel: e.start_at ? formatDateID(e.start_at) : null,
      image_url: e.thumbnail_url,
    }));

    const heroCandidates: HeroCandidate[] = (featuredRows ?? [])
      .filter((e): e is typeof e & { thumbnail_url: string } => Boolean(e.thumbnail_url))
      .map((e) => ({
        id: `event-${e.id}`,
        href: `/agenda/${e.id}`,
        title: e.title,
        thumbnail_url: e.thumbnail_url,
        category: topic.label,
        summary: e.description,
        sortDate: e.start_at ?? "",
      }));

    return {
      section: {
        kind: "cards",
        topicKey: topic.key,
        heading: topic.label,
        topicLabel: topic.label,
        viewAllHref: "/agenda",
        items,
      },
      heroCandidates,
    };
  },

  galeri: async (supabase, topic) => {
    const [{ data: rows }, { data: featuredRows }] = await Promise.all([
      supabase
        .from("gallery_items")
        .select("id, image_url, caption, created_at")
        .eq("is_published", true)
        .order("display_order")
        .order("created_at", { ascending: false })
        .limit(CARD_LIMIT),
      isTopicFeaturedAllowed([topic], topic.key)
        ? supabase
            .from("gallery_items")
            .select("id, image_url, caption, created_at")
            .eq("is_published", true)
            .eq("is_featured", true)
            .order("created_at", { ascending: false })
            .limit(HERO_CANDIDATE_LIMIT)
        : Promise.resolve({ data: [] as never[] }),
    ]);

    const items: HomeCardItem[] = (rows ?? []).map((g) => ({
      id: g.id,
      href: "/galeri",
      title: g.caption || `${topic.label} HIMASAL Probolinggo`,
      image_url: g.image_url,
    }));

    const heroCandidates: HeroCandidate[] = (featuredRows ?? []).map((g) => ({
      id: `galeri-${g.id}`,
      href: "/galeri",
      title: g.caption || `${topic.label} HIMASAL Probolinggo`,
      thumbnail_url: g.image_url,
      category: topic.label,
      sortDate: g.created_at,
    }));

    return {
      section: {
        kind: "cards",
        topicKey: topic.key,
        heading: topic.label,
        topicLabel: topic.label,
        viewAllHref: "/galeri",
        items,
      },
      heroCandidates,
    };
  },

  struktur: async (supabase, topic) => {
    const [{ data: rows }, { data: featuredRows }] = await Promise.all([
      supabase
        .from("organization_structure")
        .select("id, nama, jabatan, foto_url")
        .eq("is_active", true)
        .order("display_order")
        .limit(CARD_LIMIT),
      isTopicFeaturedAllowed([topic], topic.key)
        ? supabase
            .from("organization_structure")
            .select("id, nama, jabatan, foto_url, created_at")
            .eq("is_active", true)
            .eq("is_featured", true)
            .not("foto_url", "is", null)
            .order("created_at", { ascending: false })
            .limit(HERO_CANDIDATE_LIMIT)
        : Promise.resolve({ data: [] as never[] }),
    ]);

    const items: HomeCardItem[] = (rows ?? []).map((s) => ({
      id: s.id,
      href: "/struktur",
      title: s.nama,
      summary: s.jabatan,
      image_url: s.foto_url,
    }));

    const heroCandidates: HeroCandidate[] = (featuredRows ?? [])
      .filter((s): s is typeof s & { foto_url: string } => Boolean(s.foto_url))
      .map((s) => ({
        id: `struktur-${s.id}`,
        href: "/struktur",
        title: `${s.nama} - ${s.jabatan}`,
        thumbnail_url: s.foto_url,
        category: topic.label,
        sortDate: s.created_at,
      }));

    return {
      section: {
        kind: "cards",
        topicKey: topic.key,
        heading: topic.label,
        topicLabel: topic.label,
        viewAllHref: "/struktur",
        items,
      },
      heroCandidates,
    };
  },

  masayikh: async (supabase, topic) => {
    const [{ data: rows }, { data: featuredRows }] = await Promise.all([
      supabase
        .from("masayikh")
        .select("id, nama, deskripsi, foto_url")
        .eq("is_active", true)
        .order("display_order")
        .limit(CARD_LIMIT),
      isTopicFeaturedAllowed([topic], topic.key)
        ? supabase
            .from("masayikh")
            .select("id, nama, deskripsi, foto_url, created_at")
            .eq("is_active", true)
            .eq("is_featured", true)
            .not("foto_url", "is", null)
            .order("created_at", { ascending: false })
            .limit(HERO_CANDIDATE_LIMIT)
        : Promise.resolve({ data: [] as never[] }),
    ]);

    const items: HomeCardItem[] = (rows ?? []).map((m) => ({
      id: m.id,
      href: "/masayikh",
      title: m.nama,
      summary: m.deskripsi,
      image_url: m.foto_url,
    }));

    const heroCandidates: HeroCandidate[] = (featuredRows ?? [])
      .filter((m): m is typeof m & { foto_url: string } => Boolean(m.foto_url))
      .map((m) => ({
        id: `masayikh-${m.id}`,
        href: "/masayikh",
        title: m.nama,
        thumbnail_url: m.foto_url,
        category: topic.label,
        summary: m.deskripsi,
        sortDate: m.created_at,
      }));

    return {
      section: {
        kind: "cards",
        topicKey: topic.key,
        heading: topic.label,
        topicLabel: topic.label,
        viewAllHref: "/masayikh",
        items,
      },
      heroCandidates,
    };
  },

  profil: async (supabase, topic) => {
    const { data: profile } = await supabase
      .from("organization_profile")
      .select("deskripsi, image_url, is_featured, updated_at")
      .single();

    const heroCandidates: HeroCandidate[] =
      isTopicFeaturedAllowed([topic], topic.key) && profile?.is_featured && profile.image_url
        ? [
            {
              id: "profil",
              href: "/profil",
              title: `${topic.label} HIMASAL Probolinggo`,
              thumbnail_url: profile.image_url,
              category: topic.label,
              summary: profile.deskripsi,
              sortDate: profile.updated_at,
            },
          ]
        : [];

    return {
      section: {
        kind: "text",
        topicKey: topic.key,
        heading: topic.label,
        body: profile?.deskripsi ?? null,
        viewAllHref: "/profil",
      },
      heroCandidates,
    };
  },
};

/**
 * Section generik untuk topik TANPA tabel khusus (Konten + topik custom
 * buatan Admin) - dibackup satu tabel bersama `topic_content`. Karena
 * `topic_id` pakai ON DELETE SET NULL (bukan CASCADE), menghapus topik
 * tidak pernah menghapus baris `topic_content` - baris itu hanya menjadi
 * tanpa topik (uncategorized) dan berhenti tampil di Beranda/nav publik.
 */
async function fetchGenericSection(
  supabase: PublicSupabase,
  topic: SiteTopic,
): Promise<SectionFetchResult> {
  const [{ data: rows }, { data: featuredRows }] = await Promise.all([
    supabase
      .from("topic_content")
      .select("id, title, description, image_url, link_url")
      .eq("topic_id", topic.id)
      .eq("is_active", true)
      .order("display_order")
      .order("created_at", { ascending: false })
      .limit(CARD_LIMIT),
    isTopicFeaturedAllowed([topic], topic.key)
      ? supabase
          .from("topic_content")
          .select("id, title, description, image_url, link_url, created_at")
          .eq("topic_id", topic.id)
          .eq("is_active", true)
          .eq("is_featured", true)
          .not("image_url", "is", null)
          .order("created_at", { ascending: false })
          .limit(HERO_CANDIDATE_LIMIT)
      : Promise.resolve({ data: [] as never[] }),
  ]);

  const viewAllHref = topicHref(topic);

  const items: HomeCardItem[] = (rows ?? []).map((c) => ({
    id: c.id,
    href: c.link_url || viewAllHref,
    title: c.title,
    summary: c.description,
    image_url: c.image_url,
  }));

  const heroCandidates: HeroCandidate[] = (featuredRows ?? [])
    .filter((c): c is typeof c & { image_url: string } => Boolean(c.image_url))
    .map((c) => ({
      id: `topic-content-${c.id}`,
      href: c.link_url || viewAllHref,
      title: c.title,
      thumbnail_url: c.image_url,
      category: topic.label,
      summary: c.description,
      sortDate: c.created_at,
    }));

  return {
    section: {
      kind: "cards",
      topicKey: topic.key,
      heading: topic.label,
      topicLabel: topic.label,
      viewAllHref,
      items,
    },
    heroCandidates,
  };
}

/**
 * Render section untuk semua topik aktif KECUALI Berita (punya 3 section
 * tetap, ditangani fetchBeritaSections di atas dan dirender terpisah
 * sebelum loop ini - lihat Beranda). Iterasi berdasarkan display_order,
 * lalu untuk tiap topik ambil section + kandidat hero-nya lewat registry
 * di atas (atau fallback generik). TIDAK ADA percabangan "if key === ..."
 * di halaman Beranda itu sendiri - topik baru otomatis mendapat section
 * tanpa menambah JSX baru di sana.
 *
 * Setiap topik AKTIF SELALU menghasilkan satu section, walau kontennya
 * kosong (items: [] / body: null) - Beranda merender section itu dengan
 * empty state sederhana, bukan menyembunyikannya. Ini supaya Admin selalu
 * bisa melihat bahwa topik tersebut sudah "siap" di Beranda begitu topik
 * dibuat/diaktifkan, walau kontennya belum diisi.
 */
export async function fetchHomeSections(
  supabase: PublicSupabase,
  topics: SiteTopic[] | null | undefined,
): Promise<{ sections: HomeSection[]; heroCandidates: HeroCandidate[] }> {
  const activeTopics = (topics ?? [])
    .filter((t) => t.is_active && t.key !== "berita")
    .sort((a, b) => a.display_order - b.display_order);

  const results = await Promise.all(
    activeTopics.map(async (topic) => {
      const fetcher = topic.is_system ? SYSTEM_FETCHERS[topic.key] : undefined;
      const base = await (fetcher ? fetcher(supabase, topic) : fetchGenericSection(supabase, topic));

      // Berita yang Admin tandai Topik-nya = topik ini (bukan Berita)
      // digabung ke section topik ini - lihat fetchTopicNews. Section
      // "text" (Profil) tidak punya daftar item untuk digabung, jadi
      // artikel yang ditandai ke topik itu tetap ada datanya tapi tidak
      // dirender sebagai card di sana.
      const newsExtra = await fetchTopicNews(supabase, topic);
      if (newsExtra.items.length === 0 && newsExtra.heroCandidates.length === 0) {
        return base;
      }

      const heroCandidates = [...base.heroCandidates, ...newsExtra.heroCandidates];
      if (base.section.kind !== "cards" || newsExtra.items.length === 0) {
        return { section: base.section, heroCandidates };
      }

      // Konten topik ini dulu, sisa slot diisi berita yang ditandai ke
      // topik ini - urutan sederhana dan dapat diprediksi, bukan
      // interleave berdasarkan tanggal lintas dua sumber data berbeda.
      const items = [...base.section.items, ...newsExtra.items].slice(0, CARD_LIMIT);
      return { section: { ...base.section, items }, heroCandidates };
    }),
  );

  // Berita tidak punya section sendiri di Beranda (sudah terwakili oleh
  // Terbaru/Populer), tapi berita Unggulan yang topiknya Berita tetap
  // kandidat Hero yang sah - dulu disuplai fetchBeritaSections (sudah
  // dihapus), jadi diambil di sini tanpa membuat section.
  const beritaTopic = (topics ?? []).find((t) => t.is_active && t.key === "berita");
  const beritaHero = beritaTopic ? (await fetchTopicNews(supabase, beritaTopic)).heroCandidates : [];

  const sections = results.map((r) => r.section);
  const heroCandidates = [...results.flatMap((r) => r.heroCandidates), ...beritaHero];

  return { sections, heroCandidates };
}

/**
 * Gabungkan kandidat hero dari semua topik (termasuk berita bertopik
 * Berita, lihat fetchHomeSections), urutkan berdasarkan tanggal terbaru,
 * batasi HERO_SLIDE_LIMIT.
 */
export function finalizeHeroSlides(candidates: HeroCandidate[]): HeroSlide[] {
  return candidates
    .sort((a, b) => (a.sortDate < b.sortDate ? 1 : -1))
    .slice(0, HERO_SLIDE_LIMIT)
    .map((slide) => ({
      id: slide.id,
      href: slide.href,
      title: slide.title,
      thumbnail_url: slide.thumbnail_url,
      category: slide.category,
      summary: slide.summary,
      date: slide.sortDate ? formatDateID(slide.sortDate) : null,
    }));
}
