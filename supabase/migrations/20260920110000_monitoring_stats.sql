-- Fase 6: Dashboard & Monitoring (Admin + Super Admin).
--
-- KEPUTUSAN ARSITEKTUR:
--
-- Tidak ada tabel baru sama sekali. Empat fungsi di bawah murni membaca
-- (read-only aggregate) dari tabel yang sudah ada (alumni, events,
-- attendance_records, wilayah). Alasan dibuat sebagai fungsi database
-- (bukan dihitung di aplikasi setelah fetch mentah): PostgREST (dipakai
-- lewat supabase-js `.from()`) tidak mendukung GROUP BY/aggregate custom,
-- sehingga tanpa fungsi ini statistik terpaksa dihitung di server Next.js
-- setelah menarik seluruh baris attendance_records/events - boros dan
-- melanggar arahan "jangan ambil seluruh data jika cukup aggregate query".
--
-- Pola mengikuti persis alumni_stats()/alumni_stats_by_wilayah() dari
-- Fase 2: SECURITY DEFINER + guard eksplisit is_admin() OR is_super_admin()
-- di awal fungsi, stable, search_path kosong. Fungsi-fungsi ini dipakai
-- BERSAMA oleh dashboard Admin dan Super Admin (keduanya diizinkan guard-nya)
-- - TIDAK memberi kemampuan tulis apa pun ke Super Admin, murni SELECT/COUNT.
--
-- TIDAK ADA perubahan pada tabel/policy Fase 0-5 manapun. TIDAK ADA
-- tabel/kolom terkait Fiqh. TIDAK menyentuh project/aset RuangBerita.

-- ============================================================
-- 1. monitoring_overview - kartu ringkasan utama + persentase kehadiran.
--    p_year/p_event_id/p_wilayah_id semuanya opsional (null = tanpa filter).
-- ============================================================
create or replace function public.monitoring_overview(
  p_year integer default null,
  p_event_id uuid default null,
  p_wilayah_id uuid default null
)
returns table (
  total_alumni_aktif bigint,
  total_alumni_nonaktif bigint,
  total_events bigint,
  total_mandatory_events bigint,
  total_hadir bigint,
  total_tidak_hadir bigint,
  total_izin bigint,
  total_sakit bigint
)
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
  with filtered_attendance as (
    select ar.status
    from public.attendance_records ar
    join public.events e on e.id = ar.event_id
    join public.alumni a on a.id = ar.alumni_id
    where (p_year is null or extract(year from e.start_at) = p_year)
      and (p_event_id is null or ar.event_id = p_event_id)
      and (p_wilayah_id is null or a.wilayah_id = p_wilayah_id)
  )
  select
    (select count(*) from public.alumni a
      where a.status_keanggotaan = 'aktif'
        and (p_wilayah_id is null or a.wilayah_id = p_wilayah_id)),
    (select count(*) from public.alumni a
      where a.status_keanggotaan = 'nonaktif'
        and (p_wilayah_id is null or a.wilayah_id = p_wilayah_id)),
    (select count(*) from public.events e
      where (p_year is null or extract(year from e.start_at) = p_year)
        and (p_event_id is null or e.id = p_event_id)),
    (select count(*) from public.events e
      where e.is_mandatory
        and (p_year is null or extract(year from e.start_at) = p_year)
        and (p_event_id is null or e.id = p_event_id)),
    (select count(*) filter (where status = 'HADIR') from filtered_attendance),
    (select count(*) filter (where status = 'TIDAK_HADIR') from filtered_attendance),
    (select count(*) filter (where status = 'IZIN') from filtered_attendance),
    (select count(*) filter (where status = 'SAKIT') from filtered_attendance);
end;
$$;

revoke all on function public.monitoring_overview(integer, uuid, uuid)
  from public, anon, authenticated;
grant execute on function public.monitoring_overview(integer, uuid, uuid)
  to authenticated;

-- ============================================================
-- 2. monitoring_period_stats - breakdown per bulan (12 baris, zero-filled)
--    untuk satu tahun tertentu. p_year null berarti tahun berjalan.
-- ============================================================
create or replace function public.monitoring_period_stats(
  p_year integer default null,
  p_event_id uuid default null,
  p_wilayah_id uuid default null
)
returns table (
  month integer,
  total_events bigint,
  total_mandatory_events bigint,
  hadir bigint,
  tidak_hadir bigint,
  izin bigint,
  sakit bigint
)
language plpgsql
security definer
stable
set search_path = ''
as $$
declare
  v_year integer := coalesce(p_year, extract(year from now())::integer);
begin
  if not (public.is_admin() or public.is_super_admin()) then
    raise exception 'Tidak memiliki akses';
  end if;

  return query
  with months as (
    select generate_series(1, 12) as month
  ),
  events_agg as (
    select
      extract(month from e.start_at)::integer as month,
      count(*) as total_events,
      count(*) filter (where e.is_mandatory) as total_mandatory_events
    from public.events e
    where extract(year from e.start_at) = v_year
      and (p_event_id is null or e.id = p_event_id)
    group by 1
  ),
  attendance_agg as (
    select
      extract(month from e.start_at)::integer as month,
      count(*) filter (where ar.status = 'HADIR') as hadir,
      count(*) filter (where ar.status = 'TIDAK_HADIR') as tidak_hadir,
      count(*) filter (where ar.status = 'IZIN') as izin,
      count(*) filter (where ar.status = 'SAKIT') as sakit
    from public.attendance_records ar
    join public.events e on e.id = ar.event_id
    join public.alumni a on a.id = ar.alumni_id
    where extract(year from e.start_at) = v_year
      and (p_event_id is null or ar.event_id = p_event_id)
      and (p_wilayah_id is null or a.wilayah_id = p_wilayah_id)
    group by 1
  )
  select
    m.month,
    coalesce(ea.total_events, 0),
    coalesce(ea.total_mandatory_events, 0),
    coalesce(aa.hadir, 0),
    coalesce(aa.tidak_hadir, 0),
    coalesce(aa.izin, 0),
    coalesce(aa.sakit, 0)
  from months m
  left join events_agg ea on ea.month = m.month
  left join attendance_agg aa on aa.month = m.month
  order by m.month;
end;
$$;

revoke all on function public.monitoring_period_stats(integer, uuid, uuid)
  from public, anon, authenticated;
grant execute on function public.monitoring_period_stats(integer, uuid, uuid)
  to authenticated;

-- ============================================================
-- 3. monitoring_recent_events - tabel ringkasan kegiatan terbaru.
--    "belum_absen" dihitung dari total alumni aktif (di wilayah terpilih,
--    kalau ada) dikurangi jumlah yang sudah punya catatan apa pun - pola
--    yang sama dengan admin_close_event_attendance di Fase 5.
-- ============================================================
create or replace function public.monitoring_recent_events(
  p_limit integer default 10,
  p_year integer default null,
  p_wilayah_id uuid default null
)
returns table (
  id uuid,
  title text,
  start_at timestamptz,
  is_mandatory boolean,
  status text,
  hadir bigint,
  tidak_hadir bigint,
  izin bigint,
  sakit bigint,
  belum_absen bigint
)
language plpgsql
security definer
stable
set search_path = ''
as $$
declare
  v_limit integer := greatest(1, least(coalesce(p_limit, 10), 50));
  v_total_aktif bigint;
begin
  if not (public.is_admin() or public.is_super_admin()) then
    raise exception 'Tidak memiliki akses';
  end if;

  select count(*) into v_total_aktif
  from public.alumni a
  where a.status_keanggotaan = 'aktif'
    and (p_wilayah_id is null or a.wilayah_id = p_wilayah_id);

  return query
  with attendance_agg as (
    select
      ar.event_id,
      count(*) filter (where ar.status = 'HADIR') as hadir,
      count(*) filter (where ar.status = 'TIDAK_HADIR') as tidak_hadir,
      count(*) filter (where ar.status = 'IZIN') as izin,
      count(*) filter (where ar.status = 'SAKIT') as sakit
    from public.attendance_records ar
    join public.alumni a on a.id = ar.alumni_id
    where (p_wilayah_id is null or a.wilayah_id = p_wilayah_id)
    group by ar.event_id
  )
  select
    e.id,
    e.title,
    e.start_at,
    e.is_mandatory,
    e.status,
    coalesce(aa.hadir, 0),
    coalesce(aa.tidak_hadir, 0),
    coalesce(aa.izin, 0),
    coalesce(aa.sakit, 0),
    greatest(
      0,
      v_total_aktif - coalesce(aa.hadir, 0) - coalesce(aa.tidak_hadir, 0)
        - coalesce(aa.izin, 0) - coalesce(aa.sakit, 0)
    )
  from public.events e
  left join attendance_agg aa on aa.event_id = e.id
  where (p_year is null or extract(year from e.start_at) = p_year)
  order by e.start_at desc
  limit v_limit;
end;
$$;

revoke all on function public.monitoring_recent_events(integer, integer, uuid)
  from public, anon, authenticated;
grant execute on function public.monitoring_recent_events(integer, integer, uuid)
  to authenticated;

-- ============================================================
-- 4. monitoring_available_years - isi dropdown filter Tahun.
-- ============================================================
create or replace function public.monitoring_available_years()
returns table (year integer)
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
  select distinct extract(year from e.start_at)::integer as year
  from public.events e
  order by year desc;
end;
$$;

revoke all on function public.monitoring_available_years()
  from public, anon, authenticated;
grant execute on function public.monitoring_available_years()
  to authenticated;
