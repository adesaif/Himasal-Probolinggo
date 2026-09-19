-- Fase 0 (fix): perbaikan ditemukan saat verifikasi pasca-deploy.
--
-- 1) BUG KRITIS: admin_set_role menggunakan `if v_caller_role not in (...)`.
--    Jika pemanggil belum login / belum punya baris di profiles,
--    v_caller_role bernilai NULL. Di PL/pgSQL, `NULL not in (...)`
--    menghasilkan NULL, dan `if NULL then` diperlakukan sebagai FALSE -
--    sehingga exception tidak pernah terlempar dan kedua guard clause bisa
--    dilewati oleh caller anonim, membuka celah privilege escalation ke
--    role super_admin. Diperbaiki dengan pengecekan NULL eksplisit.
--
-- 2) Supabase secara default memberi GRANT EXECUTE ke role `anon` dan
--    `authenticated` langsung saat function dibuat (default privileges),
--    terlepas dari `revoke ... from public` di migration sebelumnya
--    (revoke dari PUBLIC tidak mencabut grant langsung ke anon/authenticated).
--    Di sini akses anon dicabut eksplisit dari seluruh function
--    SECURITY DEFINER.

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

  if v_caller_role is null or v_caller_role not in ('admin', 'super_admin') then
    raise exception 'Hanya Admin atau Super Admin yang boleh mengubah role';
  end if;

  if p_new_role = 'super_admin' and v_caller_role is distinct from 'super_admin' then
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

-- RPC yang boleh dipanggil client (authenticated saja, anon dicabut).
revoke execute on function public.admin_set_role(uuid, public.app_role)
  from public, anon, authenticated;
grant execute on function public.admin_set_role(uuid, public.app_role)
  to authenticated;

revoke execute on function public.update_own_profile(text, text, text)
  from public, anon, authenticated;
grant execute on function public.update_own_profile(text, text, text)
  to authenticated;

-- Helper read-only: aman untuk authenticated (hanya baca role diri sendiri),
-- tapi tidak perlu diekspos ke anon.
revoke execute on function public.current_app_role() from public, anon;
revoke execute on function public.is_admin() from public, anon;
revoke execute on function public.is_super_admin() from public, anon;

-- Function trigger: hanya dipanggil mesin trigger, tidak perlu (dan tidak
-- boleh) dipanggil langsung lewat RPC oleh role apa pun.
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.set_updated_at() from public, anon, authenticated;
