-- Fase 3: konten website publik yang dikelola Admin lewat CMS dasar.
--
-- Skema (sesuai instruksi, prioritas minimal & tidak redundan):
--   * organization_profile - singleton (1 baris tetap): sejarah/visi/misi/
--     tujuan/deskripsi. Tidak ada policy INSERT/DELETE - baris disiapkan
--     lewat migration ini, Admin hanya pernah UPDATE.
--   * site_settings - singleton juga, dipakai bersama untuk kontak (footer,
--     halaman Kontak) DAN "site settings" (nama organisasi, tagline, social)
--     supaya tidak ada dua tabel yang tumpang tindih isinya.
--   * organization_structure & masayikh - daftar record dengan display_order
--     + is_active, pola RLS sama seperti alumni: publik hanya lihat yang
--     aktif, Admin/Super Admin lihat semua, hanya Admin yang CRUD.
--   * Storage bucket "organization-assets" untuk foto struktur/masayikh -
--     terpisah total dari bucket/asset RuangBerita.
--
-- TIDAK ADA tabel/kolom terkait Fiqh di migration ini maupun di seluruh
-- database - sesuai perubahan scope proyek.

-- ============================================================
-- 1. organization_profile (singleton)
-- ============================================================
create table public.organization_profile (
  id uuid primary key default gen_random_uuid(),
  sejarah text,
  visi text,
  misi text,
  tujuan text,
  deskripsi text,
  updated_at timestamptz not null default now()
);

insert into public.organization_profile (id) values (gen_random_uuid());

create trigger set_organization_profile_updated_at
  before update on public.organization_profile
  for each row
  execute function public.set_updated_at();

alter table public.organization_profile enable row level security;

create policy "organization_profile_select_public"
  on public.organization_profile for select
  to anon, authenticated
  using (true);

create policy "organization_profile_update_admin"
  on public.organization_profile for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ============================================================
-- 2. site_settings (singleton) - kontak + identitas organisasi
-- ============================================================
create table public.site_settings (
  id uuid primary key default gen_random_uuid(),
  nama_organisasi text,
  tagline text,
  alamat text,
  email text,
  telepon text,
  whatsapp text,
  instagram_url text,
  facebook_url text,
  youtube_url text,
  tiktok_url text,
  maps_embed_url text,
  updated_at timestamptz not null default now()
);

insert into public.site_settings (id, nama_organisasi) values (gen_random_uuid(), 'HIMASAL Probolinggo');

create trigger set_site_settings_updated_at
  before update on public.site_settings
  for each row
  execute function public.set_updated_at();

alter table public.site_settings enable row level security;

create policy "site_settings_select_public"
  on public.site_settings for select
  to anon, authenticated
  using (true);

create policy "site_settings_update_admin"
  on public.site_settings for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ============================================================
-- 3. organization_structure
-- ============================================================
create table public.organization_structure (
  id uuid primary key default gen_random_uuid(),
  nama text not null,
  jabatan text not null,
  foto_url text,
  display_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger set_organization_structure_updated_at
  before update on public.organization_structure
  for each row
  execute function public.set_updated_at();

alter table public.organization_structure enable row level security;

create policy "structure_select_public"
  on public.organization_structure for select
  to anon, authenticated
  using (is_active = true);

create policy "structure_select_admin_and_super_admin"
  on public.organization_structure for select
  to authenticated
  using (public.is_admin() or public.is_super_admin());

create policy "structure_insert_admin"
  on public.organization_structure for insert
  to authenticated
  with check (public.is_admin());

create policy "structure_update_admin"
  on public.organization_structure for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "structure_delete_admin"
  on public.organization_structure for delete
  to authenticated
  using (public.is_admin());

create index if not exists organization_structure_display_order_idx
  on public.organization_structure (display_order);

-- ============================================================
-- 4. masayikh
-- ============================================================
create table public.masayikh (
  id uuid primary key default gen_random_uuid(),
  nama text not null,
  foto_url text,
  deskripsi text,
  display_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger set_masayikh_updated_at
  before update on public.masayikh
  for each row
  execute function public.set_updated_at();

alter table public.masayikh enable row level security;

create policy "masayikh_select_public"
  on public.masayikh for select
  to anon, authenticated
  using (is_active = true);

create policy "masayikh_select_admin_and_super_admin"
  on public.masayikh for select
  to authenticated
  using (public.is_admin() or public.is_super_admin());

create policy "masayikh_insert_admin"
  on public.masayikh for insert
  to authenticated
  with check (public.is_admin());

create policy "masayikh_update_admin"
  on public.masayikh for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "masayikh_delete_admin"
  on public.masayikh for delete
  to authenticated
  using (public.is_admin());

create index if not exists masayikh_display_order_idx on public.masayikh (display_order);

-- ============================================================
-- 5. RPC statistik publik (Beranda) - hanya angka agregat, aman untuk anon.
--    Terpisah dari alumni_stats() (Fase 2) yang sengaja dibatasi ke
--    Admin/Super Admin karena ada kebutuhan breakdown lebih rinci di sana.
-- ============================================================
create or replace function public.public_stats()
returns table (total_alumni_aktif bigint, total_wilayah bigint)
language sql
security definer
stable
set search_path = ''
as $$
  select
    (select count(*) from public.alumni where status_keanggotaan = 'aktif'),
    (select count(*) from public.wilayah where is_active = true);
$$;

revoke execute on function public.public_stats() from public;
grant execute on function public.public_stats() to anon, authenticated;

-- ============================================================
-- 6. Storage bucket khusus HIMASAL untuk foto struktur/masayikh.
--    Terpisah total dari bucket/asset RuangBerita (tidak ada referensi
--    ke project/bucket lain di mana pun).
-- ============================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'organization-assets',
  'organization-assets',
  true,
  2097152, -- 2 MB
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do nothing;

create policy "organization_assets_public_read"
  on storage.objects for select
  to public
  using (bucket_id = 'organization-assets');

create policy "organization_assets_admin_insert"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'organization-assets' and public.is_admin());

create policy "organization_assets_admin_update"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'organization-assets' and public.is_admin())
  with check (bucket_id = 'organization-assets' and public.is_admin());

create policy "organization_assets_admin_delete"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'organization-assets' and public.is_admin());
