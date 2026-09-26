-- Fase 0: satu-satunya jalur untuk mengubah role. Tidak ada policy UPDATE
-- pada public.profiles, sehingga ini wajib dipakai dan tidak bisa dilewati
-- lewat client-side update biasa.
--
-- Aturan bisnis (sesuai keputusan produk):
--   * Admin boleh mengatur role target menjadi 'alumni' atau 'admin'.
--   * Hanya Super Admin yang boleh mengatur role target menjadi
--     'super_admin' - ini adalah satu-satunya aksi tulis yang diizinkan
--     untuk Super Admin, sebagai mekanisme khusus di luar sifat read-only-nya.
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
  v_caller_role public.app_role;
  v_profile public.profiles;
begin
  v_caller_role := public.current_app_role();

  if v_caller_role not in ('admin', 'super_admin') then
    raise exception 'Hanya Admin atau Super Admin yang boleh mengubah role';
  end if;

  if p_new_role = 'super_admin' and v_caller_role <> 'super_admin' then
    raise exception 'Hanya Super Admin yang boleh menetapkan role super_admin';
  end if;

  update public.profiles
  set role = p_new_role
  where id = p_target_user_id
  returning * into v_profile;

  if v_profile.id is null then
    raise exception 'User target tidak ditemukan';
  end if;

  insert into public.audit_logs (actor_id, action, entity, entity_id, metadata)
  values (
    auth.uid(),
    'set_role',
    'profiles',
    p_target_user_id,
    jsonb_build_object('new_role', p_new_role, 'caller_role', v_caller_role)
  );

  return v_profile;
end;
$$;

revoke all on function public.admin_set_role from public;
grant execute on function public.admin_set_role to authenticated;
