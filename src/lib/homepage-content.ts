import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database.types";
import type { HeroSlide } from "@/components/public/hero-carousel";
import { formatDateID } from "@/lib/format-date";
import { isTopicFeaturedAllowed, topicHref, type SiteTopic } from "@/lib/topics";

type PublicSupabase = SupabaseClient<Database>;

export type HomeCardItem = {
  id: string;
  href: string;
  title: string;
  subtitle?: string | null;
  image_url?: string | null;
};

export type HomeSection =
  | {
      kind: "cards";
      topicKey: string;
      heading: string;
      viewAllHref: string;
      items: HomeCardItem[];
    }
  | {
      kind: "text";
      topicKey: string;
      heading: string;
      body: string;
      viewAllHref: string;
    };

type HeroCandidate = HeroSlide & { sortDate: string };

type SectionFetchResult = {
  section: HomeSection | null;
  heroCandidates: HeroCandidate[];
};

type SystemFetcher = (supabase: PublicSupabase, topic: SiteTopic) => Promise<SectionFetchResult>;

const CARD_LIMIT = 4;
const HERO_CANDIDATE_LIMIT = 6;

/**
 * Registry topik sistem (backed tabel konten khusus) -> cara mengambil
 * section homepage + kandidat hero-nya. Topik yang TIDAK ada di sini
 * (Konten dan topik custom apa pun buatan Admin) otomatis jatuh ke
 * `fetchGenericSection` di bawah - supaya topik baru bisa muncul di
 * Beranda tanpa menambah entry baru di sini atau JSX section baru.
 */
const SYSTEM_FETCHERS: Record<string, SystemFetcher> = {
  berita: async (supabase, topic) => {
    const [{ data: rows }, { data: featuredRows }] = await Promise.all([
      supabase
        .from("news")
        .select("id, slug, title, thumbnail_url, published_at")
        .eq("status", "published")
        .not("published_at", "is", null)
        .order("published_at", { ascending: false })
        .limit(CARD_LIMIT),
      isTopicFeaturedAllowed([topic], topic.key)
        ? supabase
            .from("news")
            .select("id, slug, title, thumbnail_url, published_at")
            .eq("status", "published")
            .eq("is_featured", true)
            .not("thumbnail_url", "is", null)
            .order("published_at", { ascending: false })
            .limit(HERO_CANDIDATE_LIMIT)
        : Promise.resolve({ data: [] as never[] }),
    ]);

    const items: HomeCardItem[] = (rows ?? []).map((n) => ({
      id: n.id,
      href: `/berita/${n.slug}`,
      title: n.title,
      subtitle: n.published_at ? formatDateID(n.published_at) : null,
      image_url: n.thumbnail_url,
    }));

    const heroCandidates: HeroCandidate[] = (featuredRows ?? [])
      .filter((n): n is typeof n & { thumbnail_url: string } => Boolean(n.thumbnail_url))
      .map((n) => ({
        id: `news-${n.id}`,
        href: `/berita/${n.slug}`,
        title: n.title,
        thumbnail_url: n.thumbnail_url,
        sortDate: n.published_at ?? "",
      }));

    return {
      section:
        items.length > 0
          ? { kind: "cards", topicKey: topic.key, heading: topic.label, viewAllHref: "/berita", items }
          : null,
      heroCandidates,
    };
  },

  agenda: async (supabase, topic) => {
    const [{ data: rows }, { data: featuredRows }] = await Promise.all([
      supabase
        .from("events")
        .select("id, title, thumbnail_url, start_at")
        .eq("status", "published")
        .order("start_at", { ascending: false })
        .limit(CARD_LIMIT),
      isTopicFeaturedAllowed([topic], topic.key)
        ? supabase
            .from("events")
            .select("id, title, thumbnail_url, start_at")
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
      subtitle: e.start_at ? formatDateID(e.start_at) : null,
      image_url: e.thumbnail_url,
    }));

    const heroCandidates: HeroCandidate[] = (featuredRows ?? [])
      .filter((e): e is typeof e & { thumbnail_url: string } => Boolean(e.thumbnail_url))
      .map((e) => ({
        id: `event-${e.id}`,
        href: `/agenda/${e.id}`,
        title: e.title,
        thumbnail_url: e.thumbnail_url,
        sortDate: e.start_at ?? "",
      }));

    return {
      section:
        items.length > 0
          ? { kind: "cards", topicKey: topic.key, heading: topic.label, viewAllHref: "/agenda", items }
          : null,
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
      sortDate: g.created_at,
    }));

    return {
      section:
        items.length > 0
          ? { kind: "cards", topicKey: topic.key, heading: topic.label, viewAllHref: "/galeri", items }
          : null,
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
      subtitle: s.jabatan,
      image_url: s.foto_url,
    }));

    const heroCandidates: HeroCandidate[] = (featuredRows ?? [])
      .filter((s): s is typeof s & { foto_url: string } => Boolean(s.foto_url))
      .map((s) => ({
        id: `struktur-${s.id}`,
        href: "/struktur",
        title: `${s.nama} - ${s.jabatan}`,
        thumbnail_url: s.foto_url,
        sortDate: s.created_at,
      }));

    return {
      section:
        items.length > 0
          ? { kind: "cards", topicKey: topic.key, heading: topic.label, viewAllHref: "/struktur", items }
          : null,
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
            .select("id, nama, foto_url, created_at")
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
      subtitle: m.deskripsi,
      image_url: m.foto_url,
    }));

    const heroCandidates: HeroCandidate[] = (featuredRows ?? [])
      .filter((m): m is typeof m & { foto_url: string } => Boolean(m.foto_url))
      .map((m) => ({
        id: `masayikh-${m.id}`,
        href: "/masayikh",
        title: m.nama,
        thumbnail_url: m.foto_url,
        sortDate: m.created_at,
      }));

    return {
      section:
        items.length > 0
          ? { kind: "cards", topicKey: topic.key, heading: topic.label, viewAllHref: "/masayikh", items }
          : null,
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
              sortDate: profile.updated_at,
            },
          ]
        : [];

    return {
      section: profile?.deskripsi
        ? { kind: "text", topicKey: topic.key, heading: topic.label, body: profile.deskripsi, viewAllHref: "/profil" }
        : null,
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
          .select("id, title, image_url, link_url, created_at")
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
    subtitle: c.description,
    image_url: c.image_url,
  }));

  const heroCandidates: HeroCandidate[] = (featuredRows ?? [])
    .filter((c): c is typeof c & { image_url: string } => Boolean(c.image_url))
    .map((c) => ({
      id: `topic-content-${c.id}`,
      href: c.link_url || viewAllHref,
      title: c.title,
      thumbnail_url: c.image_url,
      sortDate: c.created_at,
    }));

  return {
    section:
      items.length > 0
        ? { kind: "cards", topicKey: topic.key, heading: topic.label, viewAllHref, items }
        : null,
    heroCandidates,
  };
}

/**
 * Satu-satunya tempat yang tahu urutan render Beranda: iterasi topik AKTIF
 * berdasarkan display_order, lalu untuk tiap topik ambil section + kandidat
 * hero-nya lewat registry di atas (atau fallback generik). TIDAK ADA
 * percabangan "if key === ..." di halaman Beranda itu sendiri - topik baru
 * otomatis mendapat section tanpa menambah JSX baru di sana.
 */
export async function fetchHomeSections(
  supabase: PublicSupabase,
  topics: SiteTopic[] | null | undefined,
): Promise<{ sections: HomeSection[]; heroSlides: HeroSlide[] }> {
  const activeTopics = (topics ?? [])
    .filter((t) => t.is_active)
    .sort((a, b) => a.display_order - b.display_order);

  const results = await Promise.all(
    activeTopics.map((topic) => {
      const fetcher = topic.is_system ? SYSTEM_FETCHERS[topic.key] : undefined;
      return fetcher ? fetcher(supabase, topic) : fetchGenericSection(supabase, topic);
    }),
  );

  const sections = results
    .map((r) => r.section)
    .filter((s): s is HomeSection => s !== null);

  const heroSlides: HeroSlide[] = results
    .flatMap((r) => r.heroCandidates)
    .sort((a, b) => (a.sortDate < b.sortDate ? 1 : -1))
    .slice(0, 6)
    .map((slide) => ({ id: slide.id, href: slide.href, title: slide.title, thumbnail_url: slide.thumbnail_url }));

  return { sections, heroSlides };
}
