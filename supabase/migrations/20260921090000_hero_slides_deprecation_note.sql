-- Dokumentasi keputusan arsitektur: hero_slides adalah CMS Hero versi
-- lama (manual wallpaper), sudah digantikan oleh Featured Content
-- (news.is_featured / events.is_featured + site_topics.allow_featured).
-- Table TIDAK di-drop (non-destruktif) - dipertahankan sebagai
-- arsip/compatibility layer, tapi tidak lagi dibaca oleh query publik
-- mana pun. Comment ini murni metadata, tidak mengubah data/perilaku.
comment on table public.hero_slides is
  'DEPRECATED (arsip): CMS Hero manual versi lama. Hero Carousel publik '
  'sekarang bersumber dari Featured Content (news.is_featured / '
  'events.is_featured, digerbangi site_topics.allow_featured). Table ini '
  'tidak lagi dibaca oleh halaman publik mana pun, dipertahankan hanya '
  'untuk kompatibilitas/arsip - jangan drop tanpa keputusan eksplisit.';
