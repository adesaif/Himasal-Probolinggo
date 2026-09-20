-- Kategori Berita dinamis untuk homepage bergaya portal berita.
--
-- categories: dikelola penuh oleh Admin (CRUD, aktif/nonaktif, tampil di
-- Beranda, urutan, tagline). Pola RLS mengikuti hero_slides/masayikh:
-- publik hanya baca yang aktif, Admin CRUD penuh, Super Admin read-only.
--
-- news.category_id: FK baru ke categories (nullable, ADDITIVE). Kolom
-- lama `news.category` (freetext) TIDAK dihapus - dibiarkan sebagai data
-- historis/tidak dipakai UI baru, supaya migration ini tidak destruktif.
--
-- RPC public_homepage_news_by_category: mengembalikan N berita published
-- terbaru per kategori aktif+tampil-di-beranda dalam SATU query (lateral
-- join), supaya homepage tidak perlu N+1 query per kategori.
--
-- TIDAK ADA perubahan pada auth, role, attendance, QR, monitoring, atau
-- RLS tabel lain di migration ini.

-- ============================================================
-- 1. categories
-- ============================================================
create table public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  tagline text,
  display_order integer not null default 0,
  is_active boolean not null default true,
  show_on_homepage boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger set_categories_updated_at
  before update on public.categories
  for each row
  execute function public.set_updated_at();

alter table public.categories enable row level security;

create policy "categories_select_public"
  on public.categories for select
  to anon, authenticated
  using (is_active = true);

create policy "categories_select_admin_and_super_admin"
  on public.categories for select
  to authenticated
  using (public.is_admin() or public.is_super_admin());

create policy "categories_insert_admin"
  on public.categories for insert
  to authenticated
  with check (public.is_admin());

create policy "categories_update_admin"
  on public.categories for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "categories_delete_admin"
  on public.categories for delete
  to authenticated
  using (public.is_admin());

create index categories_display_order_idx on public.categories (display_order);

-- ============================================================
-- 2. news.category_id (kolom baru, additive)
-- ============================================================
alter table public.news
  add column category_id uuid references public.categories (id) on delete set null;

create index news_category_id_idx on public.news (category_id);

-- ============================================================
-- 3. RPC: N berita published terbaru per kategori aktif+tampil-di-beranda
-- ============================================================
create or replace function public.public_homepage_news_by_category(p_limit_per_category integer default 4)
returns table (
  category_id uuid,
  category_name text,
  category_slug text,
  category_tagline text,
  category_display_order integer,
  news_id uuid,
  news_slug text,
  news_title text,
  news_thumbnail_url text,
  news_published_at timestamptz
)
language sql
security definer
stable
set search_path = ''
as $$
  select
    c.id, c.name, c.slug, c.tagline, c.display_order,
    n.id, n.slug, n.title, n.thumbnail_url, n.published_at
  from public.categories c
  join lateral (
    select *
    from public.news n
    where n.category_id = c.id
      and n.status = 'published'
    order by n.published_at desc
    limit p_limit_per_category
  ) n on true
  where c.is_active = true and c.show_on_homepage = true
  order by c.display_order, n.published_at desc;
$$;

revoke execute on function public.public_homepage_news_by_category(integer) from public;
grant execute on function public.public_homepage_news_by_category(integer) to anon, authenticated;
