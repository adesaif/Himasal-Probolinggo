-- Fase 0: fondasi role & profil pengguna.
-- profiles 1:1 dengan auth.users. Data biodata alumni (nama, alamat, dst)
-- disimpan terpisah di tabel `alumni` pada Fase 2, bukan di sini.

create type public.app_role as enum ('alumni', 'admin', 'super_admin');

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role public.app_role not null default 'alumni',
  member_id text unique,
  full_name text,
  phone text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.profiles is
  'Identitas & role login. Biodata alumni lengkap ada di tabel alumni (Fase 2).';

create trigger set_profiles_updated_at
  before update on public.profiles
  for each row
  execute function public.set_updated_at();

-- Dibuat otomatis saat ada user baru di auth.users (mis. hasil undangan
-- admin). Role default 'alumni'; promosi ke admin/super_admin dilakukan
-- lewat RPC admin_set_role, tidak pernah lewat UPDATE langsung.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id)
  values (new.id);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();

-- Helper RLS: hindari rekursi kebijakan dengan query lewat fungsi
-- SECURITY DEFINER yang stabil per-statement.
create or replace function public.current_app_role()
returns public.app_role
language sql
security definer
stable
set search_path = ''
as $$
  select role from public.profiles where id = auth.uid();
$$;

create or replace function public.is_admin()
returns boolean
language sql
security definer
stable
set search_path = ''
as $$
  select public.current_app_role() = 'admin';
$$;

create or replace function public.is_super_admin()
returns boolean
language sql
security definer
stable
set search_path = ''
as $$
  select public.current_app_role() = 'super_admin';
$$;

alter table public.profiles enable row level security;

-- Setiap user login boleh melihat baris miliknya sendiri.
create policy "profiles_select_own"
  on public.profiles for select
  to authenticated
  using (id = auth.uid());

-- Admin & Super Admin boleh melihat seluruh profil (untuk manajemen akun /
-- monitoring). Ini SELECT saja - tidak ada policy UPDATE/DELETE/INSERT untuk
-- role apa pun di sini secara sengaja: seluruh perubahan role dan data
-- sensitif wajib lewat RPC SECURITY DEFINER agar aturan bisnis (mis. hanya
-- Super Admin yang boleh menaikkan role ke super_admin) tidak bisa dilewati
-- dari client.
create policy "profiles_select_admin_and_super_admin"
  on public.profiles for select
  to authenticated
  using (public.is_admin() or public.is_super_admin());

-- RPC untuk alumni/admin mengubah data profil miliknya sendiri, terbatas
-- pada kolom yang memang boleh diubah sendiri (tidak termasuk role/member_id).
create or replace function public.update_own_profile(
  p_full_name text default null,
  p_phone text default null,
  p_avatar_url text default null
)
returns public.profiles
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_profile public.profiles;
begin
  update public.profiles
  set
    full_name = coalesce(p_full_name, full_name),
    phone = coalesce(p_phone, phone),
    avatar_url = coalesce(p_avatar_url, avatar_url)
  where id = auth.uid()
  returning * into v_profile;

  if v_profile.id is null then
    raise exception 'Profil tidak ditemukan untuk user saat ini';
  end if;

  return v_profile;
end;
$$;

revoke all on function public.update_own_profile from public;
grant execute on function public.update_own_profile to authenticated;
