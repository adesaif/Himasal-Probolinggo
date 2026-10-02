-- Fase 4: Berita (news), Agenda (events), Galeri (gallery_items).
--
-- Prinsip RLS mengikuti pola yang sudah dipakai untuk organization_structure
-- dan masayikh di Fase 3: publik hanya boleh SELECT konten published, Admin
-- CRUD penuh (is_admin()), Super Admin dan Alumni sama-sama hanya baca
-- (Super Admin dapat baca draft juga untuk monitoring; Alumni hanya baca
-- yang published lewat policy publik yang sama).
--
-- `news.author_name` sengaja berupa teks (bukan FK+join ke profiles):
-- `profiles` tidak punya policy SELECT untuk anon, jadi byline penulis di
-- halaman publik tidak bisa di-join dari profiles tanpa membuka akses baca
-- publik ke tabel profiles. Snapshot teks menghindari itu sekaligus
-- mencegah byline berubah retroaktif kalau admin lain mengedit namanya.
--
-- TIDAK ADA tabel/kolom terkait Fiqh di migration ini.

-- ============================================================
-- 1. news (Berita)
-- ============================================================
create table public.news (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  excerpt text,
  content text not null,
  thumbnail_url text,
  category text,
  is_featured boolean not null default false,
  author_name text,
  status text not null default 'draft' check (status in ('draft', 'published')),
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.news is 'Berita publik. status draft/published mengontrol visibilitas.';

create trigger set_news_updated_at
  before update on public.news
  for each row
  execute function public.set_updated_at();

alter table public.news enable row level security;

create policy "news_select_public"
  on public.news for select
  to anon, authenticated
  using (status = 'published');

create policy "news_select_admin_and_super_admin"
  on public.news for select
  to authenticated
  using (public.is_admin() or public.is_super_admin());

create policy "news_insert_admin"
  on public.news for insert
  to authenticated
  with check (public.is_admin());

create policy "news_update_admin"
  on public.news for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "news_delete_admin"
  on public.news for delete
  to authenticated
  using (public.is_admin());

create index news_status_idx on public.news (status);
create index news_published_at_idx on public.news (published_at desc);
create index news_is_featured_idx on public.news (is_featured);

-- ============================================================
-- 2. events (Agenda)
-- ============================================================
create table public.events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  location text,
  start_at timestamptz not null,
  end_at timestamptz,
  is_mandatory boolean not null default false,
  status text not null default 'draft' check (status in ('draft', 'published')),
  created_by uuid references public.profiles (id) default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint events_end_after_start check (end_at is null or end_at >= start_at)
);

comment on table public.events is
  'Agenda/kegiatan. is_mandatory = wajib hadir. Dirancang agar bisa jadi '
  'referensi FK untuk modul absensi/QR di Fase 5 (id stabil, sudah ada '
  'penanda wajib hadir dan rentang waktu).';

create trigger set_events_updated_at
  before update on public.events
  for each row
  execute function public.set_updated_at();

alter table public.events enable row level security;

create policy "events_select_public"
  on public.events for select
  to anon, authenticated
  using (status = 'published');

create policy "events_select_admin_and_super_admin"
  on public.events for select
  to authenticated
  using (public.is_admin() or public.is_super_admin());

create policy "events_insert_admin"
  on public.events for insert
  to authenticated
  with check (public.is_admin());

create policy "events_update_admin"
  on public.events for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "events_delete_admin"
  on public.events for delete
  to authenticated
  using (public.is_admin());

create index events_status_idx on public.events (status);
create index events_start_at_idx on public.events (start_at);

-- ============================================================
-- 3. gallery_items (Galeri)
-- ============================================================
create table public.gallery_items (
  id uuid primary key default gen_random_uuid(),
  image_url text not null,
  caption text,
  display_order integer not null default 0,
  is_published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.gallery_items is
  'Metadata galeri foto. File gambar disimpan di Supabase Storage bucket '
  '"organization-assets" (folder gallery/) - hanya URL yang disimpan di sini.';

create trigger set_gallery_items_updated_at
  before update on public.gallery_items
  for each row
  execute function public.set_updated_at();

alter table public.gallery_items enable row level security;

create policy "gallery_items_select_public"
  on public.gallery_items for select
  to anon, authenticated
  using (is_published = true);

create policy "gallery_items_select_admin_and_super_admin"
  on public.gallery_items for select
  to authenticated
  using (public.is_admin() or public.is_super_admin());

create policy "gallery_items_insert_admin"
  on public.gallery_items for insert
  to authenticated
  with check (public.is_admin());

create policy "gallery_items_update_admin"
  on public.gallery_items for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "gallery_items_delete_admin"
  on public.gallery_items for delete
  to authenticated
  using (public.is_admin());

create index gallery_items_display_order_idx on public.gallery_items (display_order);
