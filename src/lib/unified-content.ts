import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database.types";
import { formatCardDateTimeID, formatDateID } from "@/lib/format-date";
import { topicHref, type SiteTopic } from "@/lib/topics";

type PublicSupabase = SupabaseClient<Database>;

// Cukup field yang benar-benar dipakai fetchUnifiedContent (bukan
// SiteTopic penuh) - supaya pemanggil boleh mengirim proyeksi kolom topik
// yang lebih sempit (mis. TopicOption di komponen admin) tanpa perlu
// query kolom yang tidak relevan di sini.
type TopicRef = Pick<SiteTopic, "id" | "key" | "label" | "is_active" | "is_system">;

/**
 * Satu bentuk normal untuk SEMUA content yang benar-benar merupakan
 * publikasi bertanggal (bukan data master - lihat catatan di bawah),
 * dipakai identik oleh: Admin > Berita (aggregator), homepage Terbaru &
 * Populer, dan halaman /arsip & /populer. Satu fungsi (fetchUnifiedContent)
 * di bawah adalah satu-satunya tempat query-nya - card ini TIDAK PERNAH
 * ditulis ke tabel baru, hanya dibaca dari 4 tabel existing.
 *
 * HANYA 4 sumber yang masuk ke sini: news, events, gallery_items,
 * topic_content - masing-masing punya baris dengan tanggal publikasi
 * sendiri (published_at/start_at/created_at) dan memang dimaksudkan
 * sebagai item yang bisa "diterbitkan" satu per satu. organization_profile
 * (satu baris "About" statis), organization_structure, dan masayikh
 * (data master - daftar pengurus/pengasuh, BUKAN daftar berita) sengaja
 * TIDAK disertakan - satu baris "Ahmad - Ketua" bukan sebuah artikel.
 * Ketiganya tetap jadi topic/page tersendiri (lihat homepage-content.ts),
 * hanya tidak pernah muncul di Terbaru/Populer/Admin Berita.
 */
export type UnifiedContentItem = {
  id: string;
  href: string;
  title: string;
  summary: string | null;
  image_url: string | null;
  dateLabel: string | null;
  sortDate: string;
  topicKey: string;
  topicLabel: string;
  is_popular: boolean;
  is_featured: boolean;
  // Hanya diisi untuk item bersumber `news` (satu-satunya dari 4 sumber
  // yang punya alur draft/published nyata) - dipakai Admin > Berita untuk
  // menampilkan badge status. events/gallery_items/topic_content selalu
  // sudah tersaring "tampil publik" oleh query-nya sendiri (status
  // published/is_published/is_active), jadi tidak butuh field ini.
  newsStatus?: "draft" | "published";
  // Isi lengkap artikel - HANYA diambil saat includeAllNewsStatuses=true
  // (Admin > Berita), supaya jalur publik (Terbaru/Populer/arsip) tidak
  // menarik teks panjang yang tidak pernah dirender di card. Wajib
  // disertakan saat mengisi form edit NewsFormDialog - tanpa ini, membuka
  // dialog Edit dari aggregator akan menampilkan isi kosong dan bisa
  // menimpa artikel asli jadi kosong saat disimpan.
  newsContent?: string;
  // Sama alasannya dengan newsContent - dibutuhkan form edit NewsFormDialog
  // supaya penulis tidak ikut hilang (jadi null) saat baris di-edit lewat
  // aggregator ini.
  newsAuthorName?: string | null;
};

// Kandidat per tabel dibatasi (bukan diambil semua) lalu digabung+diurutkan
// di JS - pola yang sama persis dengan yang sudah dipakai
// src/app/(public)/topik/[slug]/page.tsx untuk menggabungkan topic_content +
// news (Supabase tidak bisa UNION+range lintas tabel dalam satu query).
// Aman untuk skala konten organisasi kecil seperti ini - didokumentasikan
// di sana, bukan asumsi baru.
const CANDIDATE_CAP = 500;

async function fetchNewsItems(
  supabase: PublicSupabase,
  topicById: Map<string, TopicRef>,
  // Admin > Berita juga menjadi tempat mengelola draft berita (alur
  // authoring "Tambah Berita" -> draft -> Publikasikan) - kalau true,
  // draft ikut diambil (diurutkan pakai created_at karena draft belum
  // punya published_at). SEMUA pemanggil publik (Terbaru/Populer/arsip/
  // /populer) tidak pernah mengirim flag ini, jadi tetap murni published.
  includeAllNewsStatuses = false,
): Promise<UnifiedContentItem[]> {
  // `content` (isi artikel penuh) HANYA diminta di jalur Admin (lihat
  // catatan newsContent di atas) - jalur publik tidak pernah butuh teks
  // panjang ini hanya untuk merender sebuah card. Dua cabang literal
  // (bukan satu variable select-string) supaya tipe kolom hasil query
  // tetap ter-infer dengan benar oleh supabase-js.
  const baseQuery = includeAllNewsStatuses
    ? supabase
        .from("news")
        .select(
          "id, slug, title, excerpt, content, author_name, thumbnail_url, published_at, created_at, topic_id, is_popular, is_featured, status",
        )
    : supabase
        .from("news")
        .select(
          "id, slug, title, excerpt, thumbnail_url, published_at, created_at, topic_id, is_popular, is_featured, status",
        )
        .eq("status", "published")
        .not("published_at", "is", null);

  const { data } = await baseQuery
    .order("created_at", { ascending: false })
    .limit(CANDIDATE_CAP);

  const items: UnifiedContentItem[] = [];
  for (const n of data ?? []) {
    const content: string | undefined = "content" in n ? (n.content as string) : undefined;
    const authorName: string | null | undefined = "author_name" in n ? n.author_name : undefined;
    const topic = n.topic_id ? topicById.get(n.topic_id) : undefined;
    // Berita tanpa topik aktif (topik dihapus/dinonaktifkan setelah artikel
    // dibuat) tidak ikut aggregator publik - konsisten dengan section topik
    // lain di Beranda, yang juga hanya merender topik aktif.
    if (!topic) continue;
    const sortDate = n.published_at ?? n.created_at;
    items.push({
      id: `news-${n.id}`,
      href: `/berita/${n.slug}`,
      title: n.title,
      summary: n.excerpt,
      image_url: n.thumbnail_url,
      dateLabel: n.published_at ? formatCardDateTimeID(n.published_at) : null,
      sortDate,
      topicKey: topic.key,
      topicLabel: topic.label,
      is_popular: n.is_popular,
      is_featured: n.is_featured,
      newsStatus: n.status === "published" ? "published" : "draft",
      newsContent: content,
      newsAuthorName: authorName,
    });
  }
  return items;
}

// events (Agenda) tidak punya kolom topic_id - satu-satunya topik yang
// relevan selalu "agenda" (sama seperti fetchHomeSections/SYSTEM_FETCHERS.
// agenda di homepage-content.ts memperlakukannya). Kalau topik Agenda
// sendiri nonaktif/terhapus, seluruh event dilewati (tidak query sama
// sekali) - bukan kesalahan, tapi konsisten dengan "topik nonaktif tidak
// muncul di mana pun".
async function fetchEventItems(
  supabase: PublicSupabase,
  agendaTopic: TopicRef | undefined,
): Promise<UnifiedContentItem[]> {
  if (!agendaTopic) return [];
  const { data } = await supabase
    .from("events")
    .select("id, title, description, thumbnail_url, start_at, is_popular, is_featured")
    .eq("status", "published")
    .order("start_at", { ascending: false })
    .limit(CANDIDATE_CAP);

  return (data ?? []).map((e) => ({
    id: `event-${e.id}`,
    href: `/agenda/${e.id}`,
    title: e.title,
    summary: e.description,
    image_url: e.thumbnail_url,
    dateLabel: formatDateID(e.start_at),
    sortDate: e.start_at,
    topicKey: agendaTopic.key,
    topicLabel: agendaTopic.label,
    is_popular: e.is_popular,
    is_featured: e.is_featured,
  }));
}

// gallery_items juga tidak punya topic_id - selalu topik "galeri" (sama
// seperti SYSTEM_FETCHERS.galeri). Setiap foto adalah satu unit publikasi
// bertanggal (created_at) - berbeda dari organization_structure/masayikh
// yang barisnya adalah data master, bukan publikasi.
async function fetchGalleryItems(
  supabase: PublicSupabase,
  galeriTopic: TopicRef | undefined,
): Promise<UnifiedContentItem[]> {
  if (!galeriTopic) return [];
  const { data } = await supabase
    .from("gallery_items")
    .select("id, image_url, caption, created_at, is_popular, is_featured")
    .eq("is_published", true)
    .order("created_at", { ascending: false })
    .limit(CANDIDATE_CAP);

  return (data ?? []).map((g) => ({
    id: `gallery-${g.id}`,
    href: "/galeri",
    title: g.caption || `${galeriTopic.label} HIMASAL Probolinggo`,
    summary: null,
    image_url: g.image_url,
    dateLabel: formatDateID(g.created_at),
    sortDate: g.created_at,
    topicKey: galeriTopic.key,
    topicLabel: galeriTopic.label,
    is_popular: g.is_popular,
    is_featured: g.is_featured,
  }));
}

// topic_content (Konten + topik custom buatan Admin) - satu-satunya sumber
// generik di sini yang benar-benar punya topic_id per baris, sama seperti
// fetchGenericSection di homepage-content.ts.
async function fetchTopicContentItems(
  supabase: PublicSupabase,
  topicById: Map<string, TopicRef>,
): Promise<UnifiedContentItem[]> {
  const { data } = await supabase
    .from("topic_content")
    .select("id, title, description, image_url, link_url, topic_id, created_at, is_popular, is_featured")
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .limit(CANDIDATE_CAP);

  const items: UnifiedContentItem[] = [];
  for (const c of data ?? []) {
    const topic = c.topic_id ? topicById.get(c.topic_id) : undefined;
    if (!topic) continue;
    items.push({
      id: `topic-content-${c.id}`,
      href: c.link_url || topicHref(topic),
      title: c.title,
      summary: c.description,
      image_url: c.image_url,
      dateLabel: formatDateID(c.created_at),
      sortDate: c.created_at,
      topicKey: topic.key,
      topicLabel: topic.label,
      is_popular: c.is_popular,
      is_featured: c.is_featured,
    });
  }
  return items;
}

/**
 * Satu-satunya query aggregator - dipakai oleh Admin > Berita, Terbaru,
 * Populer, /arsip, dan /populer (lihat komentar UnifiedContentItem di
 * atas). `total` dihitung dari hasil gabungan 4 sumber di atas CANDIDATE_CAP
 * masing-masing - akurat untuk skala konten organisasi ini, sama seperti
 * batasan yang sudah didokumentasikan di /topik/[slug].
 */
export async function fetchUnifiedContent(
  supabase: PublicSupabase,
  topics: TopicRef[] | null | undefined,
  opts: {
    onlyPopular?: boolean;
    limit?: number;
    page?: number;
    pageSize?: number;
    // Admin > Berita saja - lihat catatan di fetchNewsItems.
    includeAllNewsStatuses?: boolean;
    // Filter tambahan untuk Admin > Berita (search box + selector topik) -
    // diterapkan setelah gabungan 4 sumber, bukan per-query, supaya tidak
    // perlu tahu nama kolom teks yang berbeda-beda per tabel (title vs
    // caption).
    search?: string;
    topicKey?: string;
  } = {},
): Promise<{ items: UnifiedContentItem[]; total: number }> {
  const activeTopics = (topics ?? []).filter((t) => t.is_active);
  const topicById = new Map(activeTopics.map((t) => [t.id, t]));
  const agendaTopic = activeTopics.find((t) => t.is_system && t.key === "agenda");
  const galeriTopic = activeTopics.find((t) => t.is_system && t.key === "galeri");

  const [newsItems, eventItems, galleryItems, topicContentItems] = await Promise.all([
    fetchNewsItems(supabase, topicById, opts.includeAllNewsStatuses),
    fetchEventItems(supabase, agendaTopic),
    fetchGalleryItems(supabase, galeriTopic),
    fetchTopicContentItems(supabase, topicById),
  ]);

  let all = [...newsItems, ...eventItems, ...galleryItems, ...topicContentItems];
  if (opts.onlyPopular) all = all.filter((item) => item.is_popular);
  if (opts.topicKey) all = all.filter((item) => item.topicKey === opts.topicKey);
  if (opts.search?.trim()) {
    const needle = opts.search.trim().toLowerCase();
    all = all.filter((item) => item.title.toLowerCase().includes(needle));
  }
  all.sort((a, b) => (a.sortDate < b.sortDate ? 1 : -1));

  const total = all.length;
  if (opts.limit !== undefined) {
    return { items: all.slice(0, opts.limit), total };
  }
  if (opts.page !== undefined && opts.pageSize) {
    const from = opts.page * opts.pageSize;
    return { items: all.slice(from, from + opts.pageSize), total };
  }
  return { items: all, total };
}
