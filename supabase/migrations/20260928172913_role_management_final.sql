-- Role FINAL: Alumni / Admin / Super Admin.
--
-- ATURAN:
--  - Hanya Admin yang boleh mengubah role (Super Admin & Alumni ditolak).
--  - Admin boleh menetapkan 'admin', 'super_admin', atau 'alumni'.
--  - Role hanya bisa diubah untuk akun yang TERHUBUNG ke record Alumni
--    (satu akun = satu Alumni, dijamin UNIQUE(alumni.profile_id)). Alumni
--    yang belum punya akun dibuatkan akun lebih dulu oleh server (Supabase
--    Auth, lihat src/app/api/admin/alumni/[id]/role/route.ts), dihubungkan
--    lewat admin_link_alumni_account, baru role-nya diubah di sini.
--  - Admin Pusat = akun Admin TANPA record Alumni. Karena role hanya bisa
--    diubah untuk akun yang punya record Alumni, Admin Pusat tidak pernah
--    bisa diturunkan/diubah lewat RPC ini. Data Admin Pusat tidak disentuh.
--  - Tidak ada yang bisa mengubah role akunnya sendiri (mencegah Admin
--    tanpa sengaja mengunci dirinya).
--  - Mengubah role TIDAK membuat/menghapus record Alumni maupun akun Auth -
--    hanya profiles.role yang berubah. Semua perubahan masuk audit_logs.
--  - Alumni yang sedang ber-role Admin/Super Admin tidak boleh dihapus;
--    turunkan ke Alumni dulu.
--
-- Tidak ada trigger baru, tidak ada perubahan tabel/data.

create or replace function public.admin_set_role(
  p_target_user_id uuid,
  p_new_role public.app_role
)
returns public.profiles
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_old_role public.app_role;
  v_alumni_id uuid;
  v_profile public.profiles;
begin
  if not public.is_admin() then
    raise exception 'Hanya Admin yang boleh mengubah role';
  end if;

  if p_new_role is null then
    raise exception 'Role baru wajib diisi';
  end if;

  if p_target_user_id = auth.uid() then
    raise exception 'Tidak dapat mengubah role akun sendiri';
  end if;

  select role into v_old_role
  from public.profiles
  where id = p_target_user_id
  for update;

  if v_old_role is null then
    raise exception 'Akun target tidak ditemukan';
  end if;

  select id into v_alumni_id
  from public.alumni
  where profile_id = p_target_user_id;

  if v_alumni_id is null then
    raise exception 'Role hanya dapat diubah untuk akun yang terhubung ke Data Alumni';
  end if;

  if v_old_role = p_new_role then
    raise exception 'Akun ini sudah ber-role %', p_new_role;
  end if;

  update public.profiles
  set role = p_new_role
  where id = p_target_user_id
  returning * into v_profile;

  insert into public.audit_logs (actor_id, action, entity, entity_id, metadata)
  values (
    auth.uid(),
    'set_role',
    'profiles',
    p_target_user_id,
    jsonb_build_object(
      'old_role', v_old_role,
      'new_role', p_new_role,
      'alumni_id', v_alumni_id
    )
  );

  return v_profile;
end;
$$;

revoke execute on function public.admin_set_role(uuid, public.app_role) from public, anon;
grant execute on function public.admin_set_role(uuid, public.app_role) to authenticated;

-- Versi berbasis record Alumni (dipakai UI Admin -> Alumni): cari akun yang
-- terhubung, lalu delegasikan ke admin_set_role (semua aturan di atas).
create or replace function public.admin_set_alumni_role(
  p_alumni_id uuid,
  p_new_role public.app_role
)
returns public.profiles
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_profile_id uuid;
begin
  if not public.is_admin() then
    raise exception 'Hanya Admin yang boleh mengubah role';
  end if;

  select profile_id into v_profile_id
  from public.alumni
  where id = p_alumni_id;

  if not found then
    raise exception 'Data alumni tidak ditemukan';
  end if;

  if v_profile_id is null then
    raise exception 'Alumni ini belum punya akun login';
  end if;

  return public.admin_set_role(v_profile_id, p_new_role);
end;
$$;

revoke execute on function public.admin_set_alumni_role(uuid, public.app_role) from public, anon;
grant execute on function public.admin_set_alumni_role(uuid, public.app_role) to authenticated;

-- Hapus Alumni: tolak kalau akun yang terhubung masih ber-role staf.
create or replace function public.admin_delete_alumni(p_alumni_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_nama text;
  v_role public.app_role;
  v_absensi bigint;
begin
  if not public.is_admin() then
    raise exception 'Hanya Admin yang boleh menghapus data alumni';
  end if;

  select coalesce(nullif(btrim(p.full_name), ''), a.nama_lengkap), p.role
    into v_nama, v_role
  from public.alumni a
  left join public.profiles p on p.id = a.profile_id
  where a.id = p_alumni_id;

  if not found then
    raise exception 'Data alumni tidak ditemukan';
  end if;

  if v_role in ('admin', 'super_admin') then
    raise exception 'Alumni ini sedang ber-role % - kembalikan ke Alumni terlebih dahulu sebelum menghapus',
      case v_role when 'admin' then 'Admin' else 'Super Admin' end;
  end if;

  select count(*) into v_absensi
  from public.attendance_records
  where alumni_id = p_alumni_id;

  delete from public.alumni where id = p_alumni_id;

  insert into public.audit_logs (actor_id, action, entity, entity_id, metadata)
  values (
    auth.uid(),
    'delete_alumni',
    'alumni',
    p_alumni_id,
    jsonb_build_object('nama', v_nama, 'absensi_ikut_terhapus', v_absensi)
  );
end;
$$;
