-- Direkonstruksi untuk paritas repo/DB - migrasi ini SUDAH TERAPLIKASI di
-- database live (versi 20260921190928) tapi filenya hilang dari repo,
-- ditemukan saat audit menyeluruh (20260925). Isi di bawah direkonstruksi
-- dari schema live (kolom, index, trigger, RLS policy) supaya persis
-- mencocokkan yang sedang berjalan - TIDAK diterapkan ulang, hanya
-- di-checked-in supaya environment baru/CI bisa mereproduksi schema saat
-- ini dari nol.
--
-- Menambahkan: tabel generik `topic_content` (backing topik generik -
-- "Konten" + topik custom buatan Admin, satu tabel untuk semua topik tanpa
-- tabel khusus), kolom `site_topics.is_system` (membedakan 7 topik yang
-- di-seed sejak awal dari topik custom buatan Admin), dan policy INSERT
-- untuk site_topics (supaya Admin bisa benar-benar membuat topik baru,
-- bukan hanya rename/toggle 7 baris seed - lihat komentar di
-- 20260920140000_site_topics.sql yang menyatakan awalnya TIDAK ada INSERT).

alter table public.site_topics
  add column is_system boolean not null default false;

update public.site_topics
set is_system = true
where key in ('berita', 'agenda', 'galeri', 'profil', 'struktur', 'masayikh', 'konten');

create policy "site_topics_insert_admin"
  on public.site_topics for insert
  to authenticated
  with check (public.is_admin());

create table public.topic_content (
  id uuid primary key default gen_random_uuid(),
  topic_id uuid references public.site_topics(id) on delete set null,
  title text not null,
  description text,
  image_url text,
  link_url text,
  is_active boolean not null default true,
  is_featured boolean not null default false,
  display_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger topic_content_set_updated_at
  before update on public.topic_content
  for each row
  execute function public.set_updated_at();

alter table public.topic_content enable row level security;

create policy "topic_content_select_public"
  on public.topic_content for select
  to anon, authenticated
  using (is_active = true);

create policy "topic_content_select_admin_all"
  on public.topic_content for select
  to authenticated
  using (public.is_admin() or public.is_super_admin());

create policy "topic_content_insert_admin"
  on public.topic_content for insert
  to authenticated
  with check (public.is_admin());

create policy "topic_content_update_admin"
  on public.topic_content for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "topic_content_delete_admin"
  on public.topic_content for delete
  to authenticated
  using (public.is_admin());
