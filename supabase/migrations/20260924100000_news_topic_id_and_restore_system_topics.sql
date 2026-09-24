-- 1) Restore missing system topics (berita/galeri/masayikh/konten). These 4
--    of the original 7 seeded rows (20260920140000_site_topics.sql) were
--    found missing from site_topics during this migration's authoring -
--    values below are copied verbatim from that original seed so the
--    restored rows are indistinguishable from ones that were never lost.
--    ON CONFLICT (key) DO NOTHING makes this idempotent/safe to rerun and
--    a no-op for any row that in fact still exists.
insert into public.site_topics
  (key, label, display_order, allow_featured, supports_featured, is_system,
   default_label, default_display_order, default_allow_featured)
values
  ('berita',   'Berita',   1, true,  true,  true, 'Berita',   1, true),
  ('galeri',   'Galeri',   3, false, false, true, 'Galeri',   3, false),
  ('masayikh', 'Masayikh', 6, false, false, true, 'Masayikh', 6, false),
  ('konten',   'Konten',   7, false, false, true, 'Konten',   7, false)
on conflict (key) do nothing;

-- 2) Topik = single source of truth for Berita classification too: a news
--    article now belongs to exactly one site_topics row. ON DELETE SET
--    NULL (never CASCADE) - deleting a topic must never destroy content,
--    matching the existing topic_content.topic_id behavior. Nullable at
--    the DB level for that same reason (a NOT NULL column can't survive
--    SET NULL); the admin form is the layer that requires a selection.
alter table public.news
  add column topic_id uuid references public.site_topics(id) on delete set null;

update public.news
set topic_id = (select id from public.site_topics where key = 'berita')
where topic_id is null;

create index news_topic_id_idx on public.news (topic_id);
