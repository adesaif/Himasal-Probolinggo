-- Restore missing system topics (additive, idempotent, insert-only).
-- berita/galeri/profil/struktur/masayikh/konten are currently missing from
-- production site_topics (deleted in earlier sessions, never durably
-- restored). Values copied verbatim from the original seed
-- (20260920140000_site_topics.sql) + the later supports_featured
-- correction (20260921100000_topic_delete_and_full_featured.sql).
-- ON CONFLICT (key) DO NOTHING: safe to rerun, no-op for rows that still
-- exist (agenda, lirboyo) - never touches their live is_active/
-- display_order/label if an admin already customized them.
insert into public.site_topics
  (key, label, display_order, allow_featured, supports_featured, is_system,
   default_label, default_display_order, default_allow_featured)
values
  ('berita',   'Berita',   1, true,  true,  true, 'Berita',   1, true),
  ('galeri',   'Galeri',   3, false, true,  true, 'Galeri',   3, false),
  ('profil',   'Profil',   4, false, true,  true, 'Profil',   4, false),
  ('struktur', 'Struktur', 5, false, true,  true, 'Struktur', 5, false),
  ('masayikh', 'Masayikh', 6, false, true,  true, 'Masayikh', 6, false),
  ('konten',   'Konten',   7, false, false, true, 'Konten',   7, false)
on conflict (key) do nothing;

-- is_popular: additive, default false, ONLY on genuine publication tables
-- (news/events/gallery_items/topic_content) - NOT on organization_profile/
-- organization_structure/masayikh, which are master data (org chart,
-- scholar directory, singleton about-page), not dated publications. See
-- src/lib/unified-content.ts for the full rationale.
alter table public.news          add column is_popular boolean not null default false;
alter table public.events        add column is_popular boolean not null default false;
alter table public.gallery_items add column is_popular boolean not null default false;
alter table public.topic_content add column is_popular boolean not null default false;
