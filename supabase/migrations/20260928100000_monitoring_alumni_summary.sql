-- Dashboard Super Admin (/monitoring): statistik Alumni yang sinkron dengan
-- Admin -> Alumni.
--
-- KEPUTUSAN:
--
-- 1) Status Alumni (Aktif/Tidak Aktif) memakai public.alumni_is_aktif() -
--    definisi yang sama persis dengan Admin -> Alumni (Aktif = minimal satu
--    attendance_records berstatus HADIR). status_keanggotaan TIDAK dipakai
--    untuk definisi ini; kolom itu tetap dipakai RPC absensi lama
--    (monitoring_overview/monitoring_recent_events) sebagai kumpulan peserta
--    untuk "Belum Absen" - fungsi-fungsi itu tidak diubah.
--
-- 2) Status akun login dihitung dari auth.users dengan aturan yang sama
--    dengan admin_alumni_account_status (Admin -> Alumni):
--      tanpa_akun         -> alumni belum terhubung ke akun
--      aktif              -> password sudah dibuat
--      menunggu_password  -> email terverifikasi, password belum dibuat
--      undangan_terkirim  -> undangan belum dibuka
--
-- 3) Distribusi per Kecamatan memakai master public.kecamatan yang sama
--    dengan Admin -> Alumni: ke-24 kecamatan selalu muncul (termasuk yang 0)
--    + satu baris "Belum Dipetakan" (kecamatan_id null) sehingga jumlahnya
--    selalu sama dengan total alumni. wilayah_id tidak dipakai.
--
-- 4) Keamanan: hanya ANGKA agregat (tanpa nama/email/baris per orang).
--    SECURITY DEFINER + guard is_admin() OR is_super_admin() - pola yang
--    sama dengan RPC monitoring lainnya (Super Admin memang tidak punya
--    SELECT langsung ke tabel alumni).
--
-- Tidak ada perubahan tabel, data, role, maupun fungsi existing.

create or replace function public.monitoring_alumni_summary()
returns table (
  total_alumni bigint,
  alumni_aktif bigint,
  alumni_tidak_aktif bigint,
  akun_belum_ada bigint,
  akun_undangan_terkirim bigint,
  akun_menunggu_password bigint,
  akun_aktif bigint
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not (public.is_admin() or public.is_super_admin()) then
    raise exception 'Tidak memiliki akses';
  end if;

  return query
  with s as (
    select
      public.alumni_is_aktif(a.id) as is_aktif,
      case
        when u.id is null then 'tanpa_akun'
        when coalesce(u.encrypted_password, '') <> '' then 'aktif'
        when u.email_confirmed_at is not null then 'menunggu_password'
        else 'undangan_terkirim'
      end as account_status
    from public.alumni a
    left join auth.users u on u.id = a.profile_id
  )
  select
    count(*),
    count(*) filter (where s.is_aktif),
    count(*) filter (where not s.is_aktif),
    count(*) filter (where s.account_status = 'tanpa_akun'),
    count(*) filter (where s.account_status = 'undangan_terkirim'),
    count(*) filter (where s.account_status = 'menunggu_password'),
    count(*) filter (where s.account_status = 'aktif')
  from s;
end;
$$;

revoke execute on function public.monitoring_alumni_summary() from public, anon;
grant execute on function public.monitoring_alumni_summary() to authenticated;

create or replace function public.monitoring_alumni_by_kecamatan()
returns table (
  kecamatan_id uuid,
  kecamatan_nama text,
  total bigint
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not (public.is_admin() or public.is_super_admin()) then
    raise exception 'Tidak memiliki akses';
  end if;

  return query
  select x.kid, x.knama, x.cnt
  from (
    select k.id as kid, k.nama as knama, count(a.id) as cnt, 0 as ord
    from public.kecamatan k
    left join public.alumni a on a.kecamatan_id = k.id
    group by k.id, k.nama
    union all
    select null::uuid, 'Belum Dipetakan'::text, count(*), 1
    from public.alumni a
    where a.kecamatan_id is null
  ) x
  order by x.ord, x.knama;
end;
$$;

revoke execute on function public.monitoring_alumni_by_kecamatan() from public, anon;
grant execute on function public.monitoring_alumni_by_kecamatan() to authenticated;
