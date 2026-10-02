-- Aktifkan kembali akun login Alumni lewat undangan email.
--
-- KEPUTUSAN ARSITEKTUR:
--
-- 1) Auth User (email + password, dikelola Supabase Auth) -> profiles (role)
--    -> alumni.profile_id. Email HANYA disimpan di auth.users (satu sumber);
--    tabel alumni tidak menjadi pengganti Supabase Auth.
--
-- 2) handle_new_user TIDAK lagi membuat baris alumni. Sebelumnya setiap user
--    baru (termasuk yang kemudian dijadikan admin/super_admin) otomatis
--    mendapat baris alumni - role baru diketahui SETELAH user dibuat, jadi
--    trigger tidak bisa membedakannya. Baris alumni kini dibuat Admin lewat
--    Admin -> Alumni lalu DIHUBUNGKAN eksplisit ke akun lewat
--    admin_link_alumni_account. Role default profil tetap 'alumni'; enum
--    app_role (alumni/admin/super_admin) tidak diubah.
--
-- 3) Pembuatan akun & pengiriman undangan dilakukan server-side (Route
--    Handler Next.js, service-role, setelah is_admin() diverifikasi). Fungsi
--    di bawah hanya membaca status (auth.users) dan menghubungkan data -
--    semuanya SECURITY DEFINER dengan guard is_admin() eksplisit.
--
-- 4) Akun Admin/Super Admin TIDAK PERNAH bisa diambil alih lewat form
--    Alumni: admin_link_alumni_account menolak profil non-alumni, dan
--    admin_save_alumni hanya menyinkronkan nama/HP ke profil ber-role
--    'alumni'.
--
-- Tidak ada DROP table/column, tidak ada perubahan data existing.

-- ============================================================
-- 1. handle_new_user: profil saja
-- ============================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, new.raw_user_meta_data ->> 'full_name');

  return new;
end;
$$;

-- ============================================================
-- 2. Cari akun berdasarkan email (cek duplikat sebelum membuat akun)
-- ============================================================
create or replace function public.admin_find_account_by_email(p_email text)
returns table (
  user_id uuid,
  role public.app_role,
  alumni_id uuid,
  alumni_nama text,
  email_confirmed boolean,
  password_set boolean
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'Hanya Admin yang boleh memeriksa akun alumni';
  end if;

  return query
  select
    u.id,
    p.role,
    a.id,
    coalesce(nullif(btrim(p.full_name), ''), a.nama_lengkap),
    u.email_confirmed_at is not null,
    coalesce(u.encrypted_password, '') <> ''
  from auth.users u
  left join public.profiles p on p.id = u.id
  left join public.alumni a on a.profile_id = u.id
  where lower(u.email) = lower(btrim(p_email))
  limit 1;
end;
$$;

revoke execute on function public.admin_find_account_by_email(text) from public, anon, authenticated;
grant execute on function public.admin_find_account_by_email(text) to authenticated;

-- ============================================================
-- 3. Hubungkan akun (role alumni) ke baris alumni
-- ============================================================
create or replace function public.admin_link_alumni_account(
  p_alumni_id uuid,
  p_user_id uuid
)
returns public.alumni
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_alumni public.alumni;
  v_role public.app_role;
begin
  if not public.is_admin() then
    raise exception 'Hanya Admin yang boleh menghubungkan akun alumni';
  end if;

  select role into v_role from public.profiles where id = p_user_id;
  if v_role is null then
    raise exception 'Profil akun tidak ditemukan';
  end if;
  if v_role <> 'alumni' then
    raise exception 'Akun ini milik Admin/Super Admin dan tidak dapat dihubungkan ke data Alumni';
  end if;

  if exists (select 1 from public.alumni where profile_id = p_user_id and id <> p_alumni_id) then
    raise exception 'Akun ini sudah terhubung dengan data alumni lain';
  end if;

  select * into v_alumni from public.alumni where id = p_alumni_id for update;
  if v_alumni.id is null then
    raise exception 'Data alumni tidak ditemukan';
  end if;
  if v_alumni.profile_id is not null and v_alumni.profile_id <> p_user_id then
    raise exception 'Data alumni ini sudah terhubung dengan akun lain';
  end if;

  update public.alumni
  set profile_id = p_user_id
  where id = p_alumni_id
  returning * into v_alumni;

  -- Nama/HP di profil mengikuti data alumni (sumber yang diisi Admin).
  update public.profiles
  set
    full_name = coalesce(v_alumni.nama_lengkap, full_name),
    phone = coalesce(v_alumni.no_hp, phone)
  where id = p_user_id;

  insert into public.audit_logs (actor_id, action, entity, entity_id, metadata)
  values (auth.uid(), 'link_alumni_account', 'alumni', v_alumni.id,
          jsonb_build_object('profile_id', p_user_id));

  return v_alumni;
end;
$$;

revoke execute on function public.admin_link_alumni_account(uuid, uuid) from public, anon, authenticated;
grant execute on function public.admin_link_alumni_account(uuid, uuid) to authenticated;

-- ============================================================
-- 4. Status akun alumni (untuk daftar & detail)
-- ============================================================
-- tanpa_akun         : alumni belum terhubung ke akun login
-- undangan_terkirim  : akun dibuat, link undangan belum dibuka
-- menunggu_password  : link sudah dibuka (email terverifikasi), password
--                      belum dibuat
-- aktif              : password sudah dibuat, bisa login
create or replace function public.admin_alumni_account_status(p_alumni_ids uuid[])
returns table (
  alumni_id uuid,
  email text,
  role public.app_role,
  account_status text,
  invited_at timestamptz,
  email_confirmed_at timestamptz,
  last_sign_in_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'Hanya Admin yang boleh melihat status akun alumni';
  end if;

  return query
  select
    a.id,
    u.email::text,
    p.role,
    case
      when u.id is null then 'tanpa_akun'
      when coalesce(u.encrypted_password, '') <> '' then 'aktif'
      when u.email_confirmed_at is not null then 'menunggu_password'
      else 'undangan_terkirim'
    end,
    u.invited_at,
    u.email_confirmed_at,
    u.last_sign_in_at
  from public.alumni a
  left join auth.users u on u.id = a.profile_id
  left join public.profiles p on p.id = a.profile_id
  where a.id = any (p_alumni_ids);
end;
$$;

revoke execute on function public.admin_alumni_account_status(uuid[]) from public, anon, authenticated;
grant execute on function public.admin_alumni_account_status(uuid[]) to authenticated;

-- ============================================================
-- 5. admin_save_alumni: sinkron nama/HP hanya ke profil ber-role alumni
-- ============================================================
-- Signature & perilaku lain identik dengan migration 20260927195352.
create or replace function public.admin_save_alumni(
  p_alumni_id uuid default null,
  p_nama_lengkap text default null,
  p_no_hp text default null,
  p_tempat_lahir text default null,
  p_tanggal_lahir date default null,
  p_kecamatan_id uuid default null,
  p_desa_kelurahan_id uuid default null,
  p_angkatan smallint default null
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
  v_alumni public.alumni;
begin
  if not public.is_admin() then
    raise exception 'Hanya Admin yang boleh mengelola data alumni';
  end if;

  if v_nama is null then
    raise exception 'Nama lengkap wajib diisi';
  end if;

  if p_angkatan is not null
     and (p_angkatan < 1800 or p_angkatan > extract(year from now())::int) then
    raise exception 'Angkatan harus antara 1800 dan tahun berjalan';
  end if;

  if p_desa_kelurahan_id is not null and not exists (
    select 1 from public.desa_kelurahan d
    where d.id = p_desa_kelurahan_id and d.kecamatan_id = p_kecamatan_id
  ) then
    raise exception 'Desa/Kelurahan tidak termasuk kecamatan yang dipilih';
  end if;

  if p_alumni_id is null then
    insert into public.alumni (
      nama_lengkap, no_hp, tempat_lahir, tanggal_lahir,
      kecamatan_id, desa_kelurahan_id, angkatan
    )
    values (
      v_nama, v_hp, v_tempat, p_tanggal_lahir,
      p_kecamatan_id, p_desa_kelurahan_id, p_angkatan
    )
    returning * into v_alumni;
  else
    update public.alumni
    set
      nama_lengkap = v_nama,
      no_hp = v_hp,
      tempat_lahir = v_tempat,
      tanggal_lahir = p_tanggal_lahir,
      kecamatan_id = p_kecamatan_id,
      desa_kelurahan_id = p_desa_kelurahan_id,
      angkatan = p_angkatan
    where id = p_alumni_id
    returning * into v_alumni;

    if v_alumni.id is null then
      raise exception 'Data alumni tidak ditemukan';
    end if;

    -- Alumni yang punya akun: nama/HP juga disimpan di profiles (sumber
    -- yang dipakai dashboard alumni sendiri) supaya keduanya tidak beda.
    -- HANYA untuk akun ber-role 'alumni': form Alumni tidak boleh mengubah
    -- identitas akun Admin/Super Admin.
    if v_alumni.profile_id is not null then
      update public.profiles
      set full_name = v_nama, phone = v_hp
      where id = v_alumni.profile_id
        and role = 'alumni';
    end if;
  end if;

  insert into public.audit_logs (actor_id, action, entity, entity_id, metadata)
  values (
    auth.uid(),
    case when p_alumni_id is null then 'create_alumni' else 'update_alumni' end,
    'alumni',
    v_alumni.id,
    '{}'::jsonb
  );

  return v_alumni;
end;
$$;

revoke execute on function public.admin_save_alumni(uuid, text, text, text, date, uuid, uuid, smallint) from public, anon, authenticated;
grant execute on function public.admin_save_alumni(uuid, text, text, text, date, uuid, uuid, smallint) to authenticated;
