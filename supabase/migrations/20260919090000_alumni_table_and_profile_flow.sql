-- Fase 1: tabel biodata alumni + integrasi ke flow signup.
--
-- KEPUTUSAN ARSITEKTUR (dijelaskan sebelum diterapkan):
-- Field biodata (tempat_lahir, tanggal_lahir, alamat, wilayah_id, angkatan,
-- status_keanggotaan) DITARUH DI TABEL BARU `alumni`, BUKAN ditambahkan ke
-- `profiles`. Ini konsisten dengan prinsip arsitektur yang sudah disetujui
-- di Fase 0 ("alumni terpisah dari profiles"): `profiles` hanya menyimpan
-- identitas & role (dipakai kebijakan profiles_select_admin_and_super_admin
-- yang memberi SELECT ke Admin & Super Admin), sedangkan PII sensitif
-- (tanggal lahir, alamat) sengaja dipisah ke tabel sendiri dengan kebijakan
-- RLS sendiri, supaya PII tidak otomatis ikut ter-expose kalau kelak
-- kebijakan `profiles` diperluas. `nama`, `no_hp`, dan foto/avatar TIDAK
-- diduplikasi di sini - tetap memakai profiles.full_name / profiles.phone /
-- profiles.avatar_url yang sudah ada di Fase 0.

create table public.alumni (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid unique references public.profiles (id) on delete set null,
  tempat_lahir text,
  tanggal_lahir date,
  alamat text,
  wilayah_id uuid references public.wilayah (id),
  angkatan smallint,
  status_keanggotaan text not null default 'aktif'
    check (status_keanggotaan in ('aktif', 'nonaktif')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.alumni is
  'Biodata alumni. Terpisah dari profiles supaya PII tidak otomatis '
  'ter-expose lewat kebijakan RLS profiles (lihat catatan migration).';

create trigger set_alumni_updated_at
  before update on public.alumni
  for each row
  execute function public.set_updated_at();

alter table public.alumni enable row level security;

-- Alumni hanya boleh melihat baris miliknya sendiri.
create policy "alumni_select_own"
  on public.alumni for select
  to authenticated
  using (profile_id = auth.uid());

-- Admin & Super Admin boleh melihat semua (Admin untuk kebutuhan
-- manajemen di Fase 2, Super Admin untuk monitoring di Fase 6). Ini
-- SELECT saja - tidak ada policy INSERT/UPDATE/DELETE untuk role apa pun;
-- perubahan data sendiri wajib lewat RPC di bawah, CRUD oleh Admin
-- menyusul di Fase 2 lewat RPC/route terpisah.
create policy "alumni_select_admin_and_super_admin"
  on public.alumni for select
  to authenticated
  using (public.is_admin() or public.is_super_admin());

-- RPC untuk alumni memperbarui biodata miliknya sendiri. Sengaja TIDAK
-- menyertakan `angkatan` dan `status_keanggotaan` sebagai parameter -
-- keduanya adalah data administratif yang hanya boleh diubah Admin
-- (lihat larangan eksplisit: "Alumni TIDAK BOLEH mengubah status dirinya
-- menjadi active/inactive").
create or replace function public.update_own_alumni_profile(
  p_tempat_lahir text default null,
  p_tanggal_lahir date default null,
  p_alamat text default null,
  p_wilayah_id uuid default null
)
returns public.alumni
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_alumni public.alumni;
begin
  update public.alumni
  set
    tempat_lahir = coalesce(p_tempat_lahir, tempat_lahir),
    tanggal_lahir = coalesce(p_tanggal_lahir, tanggal_lahir),
    alamat = coalesce(p_alamat, alamat),
    wilayah_id = coalesce(p_wilayah_id, wilayah_id)
  where profile_id = auth.uid()
  returning * into v_alumni;

  if v_alumni.id is null then
    raise exception 'Data alumni tidak ditemukan untuk user saat ini';
  end if;

  return v_alumni;
end;
$$;

revoke execute on function public.update_own_alumni_profile(text, date, text, uuid)
  from public, anon, authenticated;
grant execute on function public.update_own_alumni_profile(text, date, text, uuid)
  to authenticated;

-- Perluas handle_new_user (Fase 0) supaya setiap signup baru langsung
-- mendapat baris alumni kosong untuk diisi sendiri lewat halaman Profil -
-- perlu karena flow "Admin membuat data alumni dulu lalu mengundang akun"
-- belum dibangun (menyusul Fase 2), jadi tanpa ini alumni yang baru login
-- tidak punya baris `alumni` sama sekali untuk diedit.
--
-- full_name diambil dari raw_user_meta_data (mis. saat invite/signup diisi
-- `data: { full_name }`) - HANYA dipakai sebagai nama tampilan, BUKAN
-- sumber role. Role tetap memakai default kolom profiles.role ('alumni'),
-- tidak pernah dibaca dari metadata sisi client.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, new.raw_user_meta_data ->> 'full_name');

  insert into public.alumni (profile_id)
  values (new.id);

  return new;
end;
$$;
