-- Fase 2: manajemen alumni oleh Admin + monitoring agregat untuk Super Admin.
--
-- KEPUTUSAN ARSITEKTUR (dijelaskan sebelum diterapkan):
--
-- 1) TIDAK menambah kolom nama/email/no_hp baru ke `alumni`. Field-field
--    itu tetap tinggal di `profiles.full_name` / `profiles.phone` (satu
--    sumber data, sesuai instruksi "jangan duplikasi data tanpa alasan").
--    Konsekuensinya: pembuatan akun alumni dilakukan Admin lewat flow
--    "invite dulu" (Supabase Auth invite membuat auth.users -> trigger
--    handle_new_user Fase 1 otomatis membuat baris profiles+alumni kosong
--    -> Admin langsung mengisi biodata lewat admin_update_alumni). Ini
--    dilakukan di server route Next.js (service-role, server-only), bukan
--    di migration ini.
--
-- 2) Super Admin di Fase 1 punya SELECT penuh ke `alumni` (termasuk PII:
--    alamat, tanggal_lahir) lewat policy `alumni_select_admin_and_super_admin`.
--    Instruksi Fase 2 eksplisit meminta prinsip least-privilege untuk
--    Super Admin ("monitoring saja", "data sensitif hanya untuk yang
--    berhak"). Policy itu DIGANTI di sini: Super Admin kehilangan akses
--    baris mentah `alumni`, dan sebagai gantinya memakai RPC agregat
--    (alumni_stats, alumni_stats_by_wilayah) yang hanya mengembalikan
--    angka, tidak ada PII per-orang. Admin tetap punya SELECT penuh
--    (dibutuhkan untuk manajemen).

-- 1. Ganti kebijakan SELECT `alumni`: Admin saja yang boleh baca baris
--    mentah. Super Admin memakai RPC agregat di bawah.
drop policy "alumni_select_admin_and_super_admin" on public.alumni;

create policy "alumni_select_admin"
  on public.alumni for select
  to authenticated
  using (public.is_admin());

-- 2. RPC: Admin mengubah biodata alumni (termasuk nama/no HP yang
--    sebenarnya kolom di profiles, jika alumni tsb sudah punya akun).
--    Tidak pernah menyentuh role/member_id - tetap hanya admin_set_role
--    yang boleh mengubah role.
create or replace function public.admin_update_alumni(
  p_alumni_id uuid,
  p_full_name text default null,
  p_phone text default null,
  p_tempat_lahir text default null,
  p_tanggal_lahir date default null,
  p_alamat text default null,
  p_wilayah_id uuid default null,
  p_angkatan smallint default null
)
returns public.alumni
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_alumni public.alumni;
begin
  if not public.is_admin() then
    raise exception 'Hanya Admin yang boleh mengubah data alumni';
  end if;

  update public.alumni
  set
    tempat_lahir = coalesce(p_tempat_lahir, tempat_lahir),
    tanggal_lahir = coalesce(p_tanggal_lahir, tanggal_lahir),
    alamat = coalesce(p_alamat, alamat),
    wilayah_id = coalesce(p_wilayah_id, wilayah_id),
    angkatan = coalesce(p_angkatan, angkatan)
  where id = p_alumni_id
  returning * into v_alumni;

  if v_alumni.id is null then
    raise exception 'Data alumni tidak ditemukan';
  end if;

  if v_alumni.profile_id is not null and (p_full_name is not null or p_phone is not null) then
    update public.profiles
    set
      full_name = coalesce(p_full_name, full_name),
      phone = coalesce(p_phone, phone)
    where id = v_alumni.profile_id;
  end if;

  insert into public.audit_logs (actor_id, action, entity, entity_id, metadata)
  values (auth.uid(), 'update_alumni', 'alumni', v_alumni.id, '{}'::jsonb);

  return v_alumni;
end;
$$;

revoke execute on function public.admin_update_alumni(uuid, text, text, text, date, text, uuid, smallint)
  from public, anon, authenticated;
grant execute on function public.admin_update_alumni(uuid, text, text, text, date, text, uuid, smallint)
  to authenticated;

-- 3. RPC: Admin mengaktifkan/menonaktifkan alumni. Terpisah dari
--    admin_update_alumni supaya audit log lebih jelas ("kenapa berubah")
--    dan cocok dipasangkan dengan confirmation dialog di UI.
create or replace function public.admin_set_alumni_status(
  p_alumni_id uuid,
  p_status text
)
returns public.alumni
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_alumni public.alumni;
begin
  if not public.is_admin() then
    raise exception 'Hanya Admin yang boleh mengubah status alumni';
  end if;

  if p_status not in ('aktif', 'nonaktif') then
    raise exception 'Status tidak valid';
  end if;

  update public.alumni
  set status_keanggotaan = p_status
  where id = p_alumni_id
  returning * into v_alumni;

  if v_alumni.id is null then
    raise exception 'Data alumni tidak ditemukan';
  end if;

  insert into public.audit_logs (actor_id, action, entity, entity_id, metadata)
  values (auth.uid(), 'set_alumni_status', 'alumni', v_alumni.id, jsonb_build_object('status', p_status));

  return v_alumni;
end;
$$;

revoke execute on function public.admin_set_alumni_status(uuid, text)
  from public, anon, authenticated;
grant execute on function public.admin_set_alumni_status(uuid, text)
  to authenticated;

-- 4. RPC agregat untuk dashboard Admin & Super Admin. SECURITY DEFINER
--    supaya bisa menghitung lintas seluruh baris tanpa policy SELECT
--    Super Admin ke alumni, tapi hasilnya cuma angka - tidak ada baris/PII.
create or replace function public.alumni_stats()
returns table (total bigint, aktif bigint, nonaktif bigint)
language plpgsql
security definer
stable
set search_path = ''
as $$
begin
  if not (public.is_admin() or public.is_super_admin()) then
    raise exception 'Tidak memiliki akses';
  end if;

  return query
  select
    count(*) as total,
    count(*) filter (where status_keanggotaan = 'aktif') as aktif,
    count(*) filter (where status_keanggotaan = 'nonaktif') as nonaktif
  from public.alumni;
end;
$$;

revoke execute on function public.alumni_stats() from public, anon;
grant execute on function public.alumni_stats() to authenticated;

create or replace function public.alumni_stats_by_wilayah()
returns table (wilayah_id uuid, wilayah_nama text, total bigint)
language plpgsql
security definer
stable
set search_path = ''
as $$
begin
  if not (public.is_admin() or public.is_super_admin()) then
    raise exception 'Tidak memiliki akses';
  end if;

  return query
  select w.id, w.nama, count(a.id)
  from public.wilayah w
  left join public.alumni a on a.wilayah_id = w.id
  group by w.id, w.nama
  order by w.nama;
end;
$$;

revoke execute on function public.alumni_stats_by_wilayah() from public, anon;
grant execute on function public.alumni_stats_by_wilayah() to authenticated;

-- 5. Index untuk kolom filter yang dipakai halaman /admin/alumni. Tidak
--    menambah index untuk pencarian nama (di profiles.full_name, via
--    ILIKE) - skala data saat ini belum butuh trigram index, sesuai
--    arahan "jangan optimasi prematur yang kompleks".
create index if not exists alumni_wilayah_id_idx on public.alumni (wilayah_id);
create index if not exists alumni_angkatan_idx on public.alumni (angkatan);
create index if not exists alumni_status_keanggotaan_idx on public.alumni (status_keanggotaan);
