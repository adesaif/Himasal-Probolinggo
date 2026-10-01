-- Profil Alumni mandiri (/dashboard/profil) menulis ke MASTER alumni.
--
-- Sebelumnya Dashboard Alumni punya dua jalur tulis:
--   * update_own_profile        -> profiles.full_name / phone
--   * update_own_alumni_profile -> alumni.tempat/tanggal lahir, alamat, wilayah_id (lama)
-- sementara Admin (admin_save_alumni) menulis alumni.nama_lengkap / no_hp /
-- kecamatan_id / desa_kelurahan_id. Akibatnya nama & HP bisa punya dua nilai
-- berbeda, dan Alumni masih mengisi "Wilayah" lama alih-alih Kecamatan ->
-- Desa/Kelurahan.
--
-- Migration ini:
--  1. Menambah alumni_save_own_profile: satu jalur tulis untuk Alumni sendiri
--     dengan field yang SAMA seperti yang sebelumnya boleh diubah Alumni
--     (nama, HP, tempat/tanggal lahir, alamat + lokasi). Lokasi memakai
--     Kecamatan -> Desa/Kelurahan menggantikan wilayah_id (izin alamat sudah
--     ada sebelumnya - bukan izin baru). Nama/HP di profiles ikut disamakan,
--     persis pola admin_save_alumni.
--  2. Mencabut EXECUTE dua RPC lama dari authenticated supaya tidak ada lagi
--     jalur yang menulis nama/HP hanya ke profiles. Fungsinya TIDAK dihapus.
-- Tidak mengubah data, tabel, RLS, angkatan, status, role, atau absensi.

create or replace function public.alumni_save_own_profile(
  p_nama_lengkap text,
  p_no_hp text default null,
  p_tempat_lahir text default null,
  p_tanggal_lahir date default null,
  p_alamat text default null,
  p_kecamatan_id uuid default null,
  p_desa_kelurahan_id uuid default null
)
returns public.alumni
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_nama text := nullif(btrim(coalesce(p_nama_lengkap, '')), '');
  v_hp text := nullif(btrim(coalesce(p_no_hp, '')), '');
  v_tempat text := nullif(btrim(coalesce(p_tempat_lahir, '')), '');
  v_alamat text := nullif(btrim(coalesce(p_alamat, '')), '');
  v_alumni public.alumni;
begin
  if auth.uid() is null then
    raise exception 'Anda belum login';
  end if;

  -- Hanya akun ber-role alumni: identitas akun Admin/Super Admin tidak
  -- dikelola lewat profil Alumni.
  if not exists (
    select 1 from public.profiles where id = auth.uid() and role = 'alumni'
  ) then
    raise exception 'Hanya akun Alumni yang dapat mengubah profil alumni';
  end if;

  if v_nama is null then
    raise exception 'Nama lengkap wajib diisi';
  end if;
  if length(v_nama) > 150 then
    raise exception 'Nama lengkap maksimal 150 karakter';
  end if;
  if v_hp is not null and (length(v_hp) > 20 or v_hp !~ '^[0-9+()\- ]+$') then
    raise exception 'Nomor HP tidak valid';
  end if;
  if v_tempat is not null and length(v_tempat) > 100 then
    raise exception 'Tempat lahir maksimal 100 karakter';
  end if;
  if v_alamat is not null and length(v_alamat) > 500 then
    raise exception 'Alamat maksimal 500 karakter';
  end if;
  if p_tanggal_lahir is not null and p_tanggal_lahir > (now() at time zone 'Asia/Jakarta')::date then
    raise exception 'Tanggal lahir tidak valid';
  end if;

  if p_desa_kelurahan_id is not null and not exists (
    select 1 from public.desa_kelurahan d
    where d.id = p_desa_kelurahan_id and d.kecamatan_id = p_kecamatan_id
  ) then
    raise exception 'Desa/Kelurahan tidak termasuk kecamatan yang dipilih';
  end if;
  if p_kecamatan_id is not null and not exists (
    select 1 from public.kecamatan k where k.id = p_kecamatan_id
  ) then
    raise exception 'Kecamatan tidak ditemukan';
  end if;

  -- Angkatan, status_keanggotaan, profile_id, dan wilayah_id lama tidak
  -- disentuh.
  update public.alumni
  set
    nama_lengkap = v_nama,
    no_hp = v_hp,
    tempat_lahir = v_tempat,
    tanggal_lahir = p_tanggal_lahir,
    alamat = v_alamat,
    kecamatan_id = p_kecamatan_id,
    desa_kelurahan_id = p_desa_kelurahan_id
  where profile_id = auth.uid()
  returning * into v_alumni;

  if v_alumni.id is null then
    raise exception 'Akun Anda tidak terhubung dengan data alumni';
  end if;

  -- Satu identitas: nama/HP akun selalu sama dengan master alumni.
  update public.profiles
  set full_name = v_nama, phone = v_hp
  where id = auth.uid();

  insert into public.audit_logs (actor_id, action, entity, entity_id, metadata)
  values (auth.uid(), 'update_own_alumni_profile', 'alumni', v_alumni.id, '{}'::jsonb);

  return v_alumni;
end;
$$;

revoke all on function public.alumni_save_own_profile(text, text, text, date, text, uuid, uuid)
  from public, anon;
grant execute on function public.alumni_save_own_profile(text, text, text, date, text, uuid, uuid)
  to authenticated;

-- Jalur tulis lama: tidak dipakai aplikasi lagi.
revoke execute on function public.update_own_profile(text, text, text) from authenticated;
revoke execute on function public.update_own_alumni_profile(text, date, text, uuid) from authenticated;
