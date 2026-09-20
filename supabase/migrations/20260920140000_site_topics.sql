-- Topic Management: rename/active/reorder/featured-gate for the 7 fixed
-- site modules (Berita/Agenda/Galeri/Profil/Struktur/Masayikh/Konten).
-- Distinct from `categories` (grouping WITHIN Berita) and from per-item
-- `is_featured` (which content actually enters the Hero Carousel).
--
-- No CREATE, no real DELETE: RLS below only exposes SELECT (public) and
-- UPDATE (admin). There is no INSERT or DELETE policy at all, so even an
-- authenticated Admin cannot add or remove rows via the app - only the 7
-- seeded rows can ever exist, and "Reset to Default" is just an UPDATE
-- that copies the row's own default_* columns back onto its live columns.

create table public.site_topics (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  label text not null,
  description text,
  display_order integer not null default 0,
  is_active boolean not null default true,
  allow_featured boolean not null default false,
  supports_featured boolean not null default false,
  default_label text not null,
  default_description text,
  default_display_order integer not null default 0,
  default_is_active boolean not null default true,
  default_allow_featured boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger set_site_topics_updated_at
  before update on public.site_topics
  for each row
  execute function public.set_updated_at();

alter table public.site_topics enable row level security;

create policy "site_topics_select_public"
  on public.site_topics for select
  to anon, authenticated
  using (true);

create policy "site_topics_update_admin"
  on public.site_topics for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

insert into public.site_topics
  (key, label, display_order, allow_featured, supports_featured,
   default_label, default_display_order, default_allow_featured)
values
  ('berita',   'Berita',   1, true,  true,  'Berita',   1, true),
  ('agenda',   'Agenda',   2, false, true,  'Agenda',   2, false),
  ('galeri',   'Galeri',   3, false, false, 'Galeri',   3, false),
  ('profil',   'Profil',   4, false, false, 'Profil',   4, false),
  ('struktur', 'Struktur', 5, false, false, 'Struktur', 5, false),
  ('masayikh', 'Masayikh', 6, false, false, 'Masayikh', 6, false),
  ('konten',   'Konten',   7, false, false, 'Konten',   7, false);

-- events: add is_featured + thumbnail_url (additive, mirrors news).
alter table public.events
  add column is_featured boolean not null default false,
  add column thumbnail_url text;

create index events_is_featured_idx on public.events (is_featured);
