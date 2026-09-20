import type { Tables } from "@/types/database.types";

// Kolom yang benar-benar dipakai UI (lihat TOPIC_SELECT_COLUMNS di bawah) -
// sengaja tidak memakai Tables<"site_topics"> penuh (yang juga punya
// created_at/updated_at) supaya tipe ini selalu cocok dengan hasil query
// `.select(TOPIC_SELECT_COLUMNS)` di seluruh halaman/komponen.
export type SiteTopic = Pick<
  Tables<"site_topics">,
  | "id"
  | "key"
  | "label"
  | "description"
  | "display_order"
  | "is_active"
  | "allow_featured"
  | "supports_featured"
  | "default_label"
  | "default_description"
  | "default_display_order"
  | "default_is_active"
  | "default_allow_featured"
>;

export type TopicKey =
  | "berita"
  | "agenda"
  | "galeri"
  | "profil"
  | "struktur"
  | "masayikh"
  | "konten";

export const TOPIC_SELECT_COLUMNS =
  "id, key, label, description, display_order, is_active, allow_featured, supports_featured, default_label, default_description, default_display_order, default_is_active, default_allow_featured";

/**
 * Label topik untuk dipakai di nav/heading. Fail-open ke `fallback` kalau
 * baris topik belum ada/gagal dimuat, supaya nav publik tidak pernah hilang
 * hanya karena query site_topics bermasalah.
 */
export function topicLabel(
  topics: Pick<SiteTopic, "key" | "label">[] | null | undefined,
  key: TopicKey,
  fallback: string,
): string {
  return topics?.find((t) => t.key === key)?.label ?? fallback;
}

/**
 * Status aktif topik untuk gating nav/section publik. Fail-open ke `true`
 * kalau baris topik belum ada, supaya fitur existing tidak tiba-tiba hilang
 * akibat data topik yang belum lengkap.
 */
export function isTopicActive(
  topics: Pick<SiteTopic, "key" | "is_active">[] | null | undefined,
  key: TopicKey,
): boolean {
  const topic = topics?.find((t) => t.key === key);
  return topic ? topic.is_active : true;
}

/**
 * Apakah topik mengizinkan kontennya masuk Hero Carousel. Fail-closed ke
 * `false` kalau baris topik belum ada - tidak menambah eksposur featured
 * yang tidak sengaja.
 */
export function isTopicFeaturedAllowed(
  topics: Pick<SiteTopic, "key" | "is_active" | "allow_featured">[] | null | undefined,
  key: TopicKey,
): boolean {
  const topic = topics?.find((t) => t.key === key);
  return Boolean(topic?.is_active && topic.allow_featured);
}
