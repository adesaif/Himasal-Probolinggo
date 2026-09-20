-- CMS Hero Wallpaper/Carousel: memungkinkan Admin mengelola foto hero
-- beranda dari Dashboard Admin, bukan hardcode di source code.
--
-- Pola RLS & storage mengikuti konvensi CMS yang sudah ada di migration
-- 20260919130000 (masayikh/organization_structure): publik hanya boleh
-- membaca slide yang aktif, Admin CRUD penuh, Super Admin read-only.
-- Foto disimpan di bucket storage "organization-assets" yang SUDAH ADA
-- (folder "hero/") - TIDAK membuat bucket baru. Policy storage yang sudah
-- ada (organization_assets_admin_insert/update/delete) mengizinkan Admin
-- CRUD untuk seluruh bucket ini apa pun foldernya, sehingga tidak perlu
-- policy storage baru.

create table public.hero_slides (
  id uuid primary key default gen_random_uuid(),
  image_url text not null,
  alt_text text not null,
  display_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger set_hero_slides_updated_at
  before update on public.hero_slides
  for each row
  execute function public.set_updated_at();

alter table public.hero_slides enable row level security;

create policy "hero_slides_select_public"
  on public.hero_slides for select
  to anon, authenticated
  using (is_active = true);

create policy "hero_slides_select_admin_and_super_admin"
  on public.hero_slides for select
  to authenticated
  using (public.is_admin() or public.is_super_admin());

create policy "hero_slides_insert_admin"
  on public.hero_slides for insert
  to authenticated
  with check (public.is_admin());

create policy "hero_slides_update_admin"
  on public.hero_slides for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "hero_slides_delete_admin"
  on public.hero_slides for delete
  to authenticated
  using (public.is_admin());

create index if not exists hero_slides_display_order_idx on public.hero_slides (display_order);
