-- Status keaktifan Alumni DIHITUNG dari riwayat kehadiran (bukan field
-- manual). Satu sumber perhitungan untuk Dashboard Alumni, Admin, dan
-- Super Admin Monitoring.
--
-- MASTER DATA (tidak berubah):
--   alumni              = master profil (1 orang = 1 baris)
--   events              = master kegiatan
--   attendance_records  = master riwayat kehadiran
--
-- ATURAN FINAL:
--  1. Kegiatan terlaksana = events.status 'published' DAN sudah selesai
--     (coalesce(end_at, start_at) <= sekarang). Semua kegiatan, bukan hanya
--     yang wajib. Kegiatan future/berlangsung tidak pernah dihitung.
--  2. Tanggal Alumni didaftarkan (alumni.created_at, tanggal WIB) adalah
--     BATAS BAWAH perhitungan: kegiatan sebelum tanggal itu TIDAK PERNAH
--     masuk penyebut, status, maupun persentase - walaupun ada
--     attendance_record-nya (data historis/manual). Record tersebut tetap
--     tersimpan dan tetap tampil di riwayat dengan tanda "tidak dihitung".
--     Kegiatan pada tanggal pendaftaran yang sama ikut dihitung.
--  3. Persentase = HADIR / kegiatan yang diperhitungkan x 100. IZIN, SAKIT,
--     TIDAK_HADIR, dan kegiatan tanpa catatan (tidak tercatat) bukan HADIR.
--  4. Tidak Aktif (Sementara) = pada 2 bulan terakhir (tahun berjalan) yang
--     memiliki kegiatan terlaksana, Alumni tidak HADIR di keduanya. Hadir
--     lagi di kegiatan berikutnya otomatis menghapusnya (dihitung ulang).
--  5. Status tahun berjalan: belum ada kegiatan -> belum_ada_data;
--     aturan 2 bulan -> tidak_aktif_sementara; selain itu >= 50% aktif,
--     < 50% tidak_aktif. Tahun yang sudah selesai (is_final): >= 50% aktif,
--     < 50% tidak_aktif (tanpa status sementara).
--  6. Tahun & bulan memakai zona Asia/Jakarta. Tahun baru mulai dari nol;
--     riwayat tahun lalu tetap ada dan tetap bisa direkap.
--
-- status_keanggotaan TIDAK dipakai di sini - kolom itu tetap status
-- operasional existing (syarat scan QR di submit_attendance dan populasi
-- admin_close_event_attendance), keduanya tidak diubah.
--
-- Migration ini hanya mengganti FUNGSI (tidak ada tabel/kolom/data yang
-- dihapus atau diubah). RPC monitoring lama yang signature-nya berubah
-- di-drop lalu dibuat ulang (fungsi saja, bukan data).

-- ---------------------------------------------------------------------------
-- 1) Fungsi dasar INTERNAL (tidak bisa dipanggil langsung dari aplikasi)
-- ---------------------------------------------------------------------------

-- Pasangan Alumni x kegiatan terlaksana yang DIPERHITUNGKAN (aturan 1-2),
-- beserta status kehadirannya (null = tidak tercatat). SATU-SATUNYA sumber
-- penyebut: semua statistik/status/persentase dibangun dari fungsi ini.
create or replace function public.alumni_event_slots(
  p_year integer default null,
  p_as_of timestamptz default now(),
  p_alumni_id uuid default null,
  p_event_id uuid default null
)
returns table (
  alumni_id uuid,
  event_id uuid,
  event_start timestamptz,
  tahun integer,
  bulan integer,
  status text,
  scanned_at timestamptz
)
language sql
stable
set search_path = ''
as $$
  with held as (
    select e.id, e.start_at, (e.start_at at time zone 'Asia/Jakarta') as local_start
    from public.events e
    where e.status = 'published'
      and coalesce(e.end_at, e.start_at) <= p_as_of
      and (p_event_id is null or e.id = p_event_id)
      and (p_year is null
           or extract(year from e.start_at at time zone 'Asia/Jakarta')::integer = p_year)
  )
  select
    a.id,
    h.id,
    h.start_at,
    extract(year from h.local_start)::integer,
    extract(month from h.local_start)::integer,
    ar.status,
    ar.scanned_at
  from held h
  cross join public.alumni a
  left join public.attendance_records ar
    on ar.event_id = h.id and ar.alumni_id = a.id
  where (p_alumni_id is null or a.id = p_alumni_id)
    and h.local_start::date >= (a.created_at at time zone 'Asia/Jakarta')::date;
$$;

revoke execute on function public.alumni_event_slots(integer, timestamptz, uuid, uuid)
  from public, anon, authenticated;

-- Ringkasan + status per Alumni untuk satu tahun (default: tahun berjalan).
create or replace function public.alumni_activity_stats(
  p_year integer default null,
  p_as_of timestamptz default now(),
  p_alumni_id uuid default null
)
returns table (
  alumni_id uuid,
  tahun integer,
  is_final boolean,
  kegiatan integer,
  hadir integer,
  tidak_hadir integer,
  izin integer,
  sakit integer,
  tidak_tercatat integer,
  persentase numeric,
  terakhir_hadir timestamptz,
  sementara boolean,
  status text
)
language sql
stable
set search_path = ''
as $$
  with params as (
    select
      coalesce(p_year, extract(year from p_as_of at time zone 'Asia/Jakarta')::integer) as y,
      extract(year from p_as_of at time zone 'Asia/Jakarta')::integer as cur_y
  ),
  slots as (
    select s.*
    from params p,
      public.alumni_event_slots(p.y, p_as_of, p_alumni_id) s
  ),
  agg as (
    select
      s.alumni_id,
      count(*)::integer as kegiatan,
      count(*) filter (where s.status = 'HADIR')::integer as hadir,
      count(*) filter (where s.status = 'TIDAK_HADIR')::integer as tidak_hadir,
      count(*) filter (where s.status = 'IZIN')::integer as izin,
      count(*) filter (where s.status = 'SAKIT')::integer as sakit,
      count(*) filter (where s.status is null)::integer as tidak_tercatat
    from slots s
    group by s.alumni_id
  ),
  months as (
    select
      s.alumni_id,
      s.bulan,
      coalesce(bool_or(s.status = 'HADIR'), false) as ada_hadir,
      row_number() over (partition by s.alumni_id order by s.bulan desc) as rn
    from slots s
    group by s.alumni_id, s.bulan
  ),
  flag as (
    select m.alumni_id, (count(*) = 2 and not bool_or(m.ada_hadir)) as sementara
    from months m
    where m.rn <= 2
    group by m.alumni_id
  ),
  last_hadir as (
    select ar.alumni_id, max(e.start_at) as terakhir
    from public.attendance_records ar
    join public.events e on e.id = ar.event_id
    where ar.status = 'HADIR'
      and e.status = 'published'
      and coalesce(e.end_at, e.start_at) <= p_as_of
      and (p_alumni_id is null or ar.alumni_id = p_alumni_id)
    group by ar.alumni_id
  )
  select
    a.id,
    p.y,
    p.y < p.cur_y,
    coalesce(g.kegiatan, 0),
    coalesce(g.hadir, 0),
    coalesce(g.tidak_hadir, 0),
    coalesce(g.izin, 0),
    coalesce(g.sakit, 0),
    coalesce(g.tidak_tercatat, 0),
    case
      when coalesce(g.kegiatan, 0) = 0 then null
      else round(g.hadir * 100.0 / g.kegiatan, 1)
    end,
    lh.terakhir,
    (p.y = p.cur_y and coalesce(f.sementara, false)),
    case
      when p.y > p.cur_y or coalesce(g.kegiatan, 0) = 0 then 'belum_ada_data'
      when p.y = p.cur_y and coalesce(f.sementara, false) then 'tidak_aktif_sementara'
      when g.hadir * 2 >= g.kegiatan then 'aktif'
      else 'tidak_aktif'
    end
  from public.alumni a
  cross join params p
  left join agg g on g.alumni_id = a.id
  left join flag f on f.alumni_id = a.id
  left join last_hadir lh on lh.alumni_id = a.id
  where p_alumni_id is null or a.id = p_alumni_id;
$$;

revoke execute on function public.alumni_activity_stats(integer, timestamptz, uuid)
  from public, anon, authenticated;

-- Status akun login per Alumni (sama dengan admin_alumni_account_status).
create or replace function public.alumni_account_state(p_profile_id uuid)
returns text
language sql
stable
set search_path = ''
as $$
  select case
    when p_profile_id is null then 'tanpa_akun'
    when u.id is null then 'tanpa_akun'
    when coalesce(u.encrypted_password, '') <> '' then 'aktif'
    when u.email_confirmed_at is not null then 'menunggu_password'
    else 'undangan_terkirim'
  end
  from (select 1) x
  left join auth.users u on u.id = p_profile_id;
$$;

revoke execute on function public.alumni_account_state(uuid) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 2) alumni_is_aktif: definisi lama (HADIR sepanjang masa) diganti.
--    Sekarang = status tahun berjalan 'aktif'. Dijaga: Admin, Super Admin,
--    atau Alumni pemilik data.
-- ---------------------------------------------------------------------------
create or replace function public.alumni_is_aktif(p_alumni_id uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not (
    public.is_admin() or public.is_super_admin()
    or exists (select 1 from public.alumni a where a.id = p_alumni_id and a.profile_id = auth.uid())
  ) then
    raise exception 'Tidak memiliki akses';
  end if;

  return coalesce(
    (select s.status = 'aktif' from public.alumni_activity_stats(null, now(), p_alumni_id) s),
    false
  );
end;
$$;

revoke execute on function public.alumni_is_aktif(uuid) from public, anon;
grant execute on function public.alumni_is_aktif(uuid) to authenticated;

-- alumni_stats (tidak dipakai UI lagi) ikut definisi baru, bukan
-- status_keanggotaan. Signature tetap.
create or replace function public.alumni_stats()
returns table (total bigint, aktif bigint, nonaktif bigint)
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
  select
    count(*),
    count(*) filter (where s.status = 'aktif'),
    count(*) filter (where s.status <> 'aktif')
  from public.alumni_activity_stats(null, now()) s;
end;
$$;

-- ---------------------------------------------------------------------------
-- 3) Detail Alumni (MASTER VIEW) - satu RPC untuk Dashboard Alumni,
--    Admin -> Detail Alumni, dan Super Admin -> Monitoring Alumni.
--    Super Admin: No HP & Tanggal Lahir disembunyikan (null).
-- ---------------------------------------------------------------------------
create or replace function public.alumni_activity_detail(
  p_alumni_id uuid default null,
  p_year integer default null
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_id uuid := p_alumni_id;
  v_is_staff_view boolean;
  v_hide_sensitive boolean;
  v_cur_y integer := extract(year from now() at time zone 'Asia/Jakarta')::integer;
  v_year integer;
  v_result jsonb;
begin
  -- Tanpa id: Alumni yang sedang login (dashboard sendiri).
  if v_id is null then
    select a.id into v_id from public.alumni a where a.profile_id = auth.uid();
    if v_id is null then
      raise exception 'Akun Anda tidak terhubung dengan data alumni';
    end if;
  end if;

  v_is_staff_view := public.is_admin() or public.is_super_admin();
  if not v_is_staff_view and not exists (
    select 1 from public.alumni a where a.id = v_id and a.profile_id = auth.uid()
  ) then
    raise exception 'Tidak memiliki akses';
  end if;

  if not exists (select 1 from public.alumni a where a.id = v_id) then
    raise exception 'Data alumni tidak ditemukan';
  end if;

  v_hide_sensitive := public.is_super_admin();
  v_year := coalesce(p_year, v_cur_y);

  select jsonb_build_object(
    'tahun', v_year,
    'tahun_berjalan', v_cur_y,
    'data_sensitif_disembunyikan', v_hide_sensitive,
    'profil', (
      select jsonb_build_object(
        'id', a.id,
        'nama', coalesce(nullif(btrim(p.full_name), ''), nullif(btrim(a.nama_lengkap), '')),
        'alamat', nullif(btrim(a.alamat), ''),
        'kecamatan', k.nama,
        'desa_kelurahan', d.nama,
        'desa_kelurahan_jenis', d.jenis,
        'no_hp', case when v_hide_sensitive then null
                      else coalesce(nullif(btrim(p.phone), ''), nullif(btrim(a.no_hp), '')) end,
        'tempat_lahir', nullif(btrim(a.tempat_lahir), ''),
        'tanggal_lahir', case when v_hide_sensitive then null else a.tanggal_lahir end,
        'angkatan', a.angkatan,
        'terdaftar', a.created_at,
        'status_akun', public.alumni_account_state(a.profile_id),
        'role', p.role
      )
      from public.alumni a
      left join public.profiles p on p.id = a.profile_id
      left join public.kecamatan k on k.id = a.kecamatan_id
      left join public.desa_kelurahan d on d.id = a.desa_kelurahan_id
      where a.id = v_id
    ),
    'ringkasan', (
      select to_jsonb(s) - 'alumni_id'
      from public.alumni_activity_stats(v_year, now(), v_id) s
    ),
    'tahun_tersedia', (
      select coalesce(jsonb_agg(t.tahun order by t.tahun desc), '[]'::jsonb)
      from (
        select distinct s.tahun from public.alumni_event_slots(null, now(), v_id) s
        union
        select v_cur_y
      ) t
    ),
    'tren', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'bulan', m.bulan,
        'kegiatan', coalesce(x.kegiatan, 0),
        'hadir', coalesce(x.hadir, 0),
        'akan_datang', v_year > v_cur_y
          or (v_year = v_cur_y and m.bulan > extract(month from now() at time zone 'Asia/Jakarta'))
      ) order by m.bulan), '[]'::jsonb)
      from generate_series(1, 12) as m(bulan)
      left join (
        select s.bulan, count(*) as kegiatan, count(*) filter (where s.status = 'HADIR') as hadir
        from public.alumni_event_slots(v_year, now(), v_id) s
        group by s.bulan
      ) x on x.bulan = m.bulan
    ),
    -- Riwayat SEMUA tahun (terbaru dulu):
    --  - kegiatan terlaksana yang diperhitungkan (dihitung = true), status
    --    null = tidak tercatat;
    --  - catatan absensi di kegiatan SEBELUM tanggal terdaftar (dihitung =
    --    false) - tetap tampil sebagai histori, tidak masuk perhitungan.
    'riwayat', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'event_id', r.event_id,
        'judul', r.title,
        'mulai', r.start_at,
        'selesai', r.end_at,
        'lokasi', r.location,
        'wajib', r.is_mandatory,
        'tahun', r.tahun,
        'status', r.status,
        'waktu_scan', r.scanned_at,
        'dihitung', r.dihitung
      ) order by r.start_at desc), '[]'::jsonb)
      from (
        select e.id as event_id, e.title, e.start_at, e.end_at, e.location, e.is_mandatory,
               s.tahun, s.status, s.scanned_at, true as dihitung
        from public.alumni_event_slots(null, now(), v_id) s
        join public.events e on e.id = s.event_id
        union all
        select e.id, e.title, e.start_at, e.end_at, e.location, e.is_mandatory,
               extract(year from e.start_at at time zone 'Asia/Jakarta')::integer,
               ar.status, ar.scanned_at, false
        from public.attendance_records ar
        join public.events e on e.id = ar.event_id
        join public.alumni a on a.id = ar.alumni_id
        where ar.alumni_id = v_id
          and e.status = 'published'
          and coalesce(e.end_at, e.start_at) <= now()
          and (e.start_at at time zone 'Asia/Jakarta')::date
              < (a.created_at at time zone 'Asia/Jakarta')::date
      ) r
    )
  ) into v_result;

  return v_result;
end;
$$;

revoke execute on function public.alumni_activity_detail(uuid, integer) from public, anon;
grant execute on function public.alumni_activity_detail(uuid, integer) to authenticated;

-- ---------------------------------------------------------------------------
-- 4) Daftar Alumni (drill-down) - satu RPC untuk Admin -> Alumni dan
--    Super Admin -> Monitoring Alumni. Menggantikan admin_list_alumni.
--    No HP hanya dikembalikan untuk Admin.
-- ---------------------------------------------------------------------------
drop function if exists public.admin_list_alumni(text, uuid, uuid, text, smallint, integer, integer);

create or replace function public.monitoring_alumni_list(
  p_search text default null,
  p_kecamatan_id uuid default null,
  p_belum_dipetakan boolean default false,
  p_desa_kelurahan_id uuid default null,
  p_status text default null,
  p_angkatan smallint default null,
  p_akun text default null,
  p_year integer default null,
  p_limit integer default 20,
  p_offset integer default 0
)
returns table (
  id uuid,
  nama text,
  no_hp text,
  angkatan smallint,
  kecamatan_id uuid,
  kecamatan_nama text,
  desa_kelurahan_id uuid,
  desa_kelurahan_nama text,
  desa_kelurahan_jenis text,
  has_account boolean,
  account_status text,
  role public.app_role,
  status text,
  is_final boolean,
  kegiatan integer,
  hadir integer,
  persentase numeric,
  terakhir_hadir timestamptz,
  jumlah_absensi bigint,
  total_count bigint
)
language plpgsql
stable
security definer
set search_path = ''
as $$
#variable_conflict use_column
declare
  v_search text := nullif(btrim(coalesce(p_search, '')), '');
  v_is_admin boolean := public.is_admin();
begin
  if not (v_is_admin or public.is_super_admin()) then
    raise exception 'Tidak memiliki akses';
  end if;

  if p_status is not null
     and p_status not in ('aktif', 'tidak_aktif', 'tidak_aktif_sementara', 'belum_ada_data') then
    raise exception 'Status filter tidak valid';
  end if;

  if p_akun is not null and p_akun not in ('ada', 'belum') then
    raise exception 'Filter akun tidak valid';
  end if;

  if v_search is not null then
    v_search := replace(replace(replace(v_search, '\', '\\'), '%', '\%'), '_', '\_');
  end if;

  return query
  with base as (
    select
      a.id,
      coalesce(nullif(btrim(p.full_name), ''), nullif(btrim(a.nama_lengkap), '')) as nama,
      case when v_is_admin
           then coalesce(nullif(btrim(p.phone), ''), nullif(btrim(a.no_hp), ''))
      end as no_hp,
      a.angkatan,
      a.kecamatan_id,
      k.nama as kecamatan_nama,
      a.desa_kelurahan_id,
      d.nama as desa_kelurahan_nama,
      d.jenis as desa_kelurahan_jenis,
      (a.profile_id is not null) as has_account,
      public.alumni_account_state(a.profile_id) as account_status,
      p.role,
      s.status,
      s.is_final,
      s.kegiatan,
      s.hadir,
      s.persentase,
      s.terakhir_hadir,
      a.created_at
    from public.alumni a
    join public.alumni_activity_stats(p_year, now()) s on s.alumni_id = a.id
    left join public.profiles p on p.id = a.profile_id
    left join public.kecamatan k on k.id = a.kecamatan_id
    left join public.desa_kelurahan d on d.id = a.desa_kelurahan_id
    where (p_kecamatan_id is null or a.kecamatan_id = p_kecamatan_id)
      and (not coalesce(p_belum_dipetakan, false) or a.kecamatan_id is null)
      and (p_desa_kelurahan_id is null or a.desa_kelurahan_id = p_desa_kelurahan_id)
      and (p_angkatan is null or a.angkatan = p_angkatan)
      and (p_status is null or s.status = p_status)
      and (p_akun is null or (a.profile_id is not null) = (p_akun = 'ada'))
  ),
  filtered as (
    select b.*, count(*) over () as total_count
    from base b
    where v_search is null or b.nama ilike '%' || v_search || '%'
    order by lower(b.nama) asc nulls last, b.created_at desc
    limit greatest(1, least(coalesce(p_limit, 20), 100))
    offset greatest(0, coalesce(p_offset, 0))
  )
  select
    f.id, f.nama, f.no_hp, f.angkatan, f.kecamatan_id, f.kecamatan_nama,
    f.desa_kelurahan_id, f.desa_kelurahan_nama, f.desa_kelurahan_jenis,
    f.has_account, f.account_status, f.role, f.status, f.is_final,
    f.kegiatan, f.hadir, f.persentase, f.terakhir_hadir,
    (select count(*) from public.attendance_records ar where ar.alumni_id = f.id),
    f.total_count
  from filtered f
  order by lower(f.nama) asc nulls last, f.created_at desc;
end;
$$;

revoke execute on function public.monitoring_alumni_list(text, uuid, boolean, uuid, text, smallint, text, integer, integer, integer)
  from public, anon;
grant execute on function public.monitoring_alumni_list(text, uuid, boolean, uuid, text, smallint, text, integer, integer, integer)
  to authenticated;

-- ---------------------------------------------------------------------------
-- 5) Ringkasan & distribusi (Admin Dashboard + Super Admin Monitoring)
-- ---------------------------------------------------------------------------
drop function if exists public.monitoring_alumni_summary();

create or replace function public.monitoring_alumni_summary(p_year integer default null)
returns table (
  tahun integer,
  is_final boolean,
  total_alumni bigint,
  status_aktif bigint,
  status_tidak_aktif bigint,
  status_sementara bigint,
  status_belum_ada_data bigint,
  akun_belum_ada bigint,
  akun_undangan_terkirim bigint,
  akun_menunggu_password bigint,
  akun_aktif bigint,
  role_alumni bigint,
  role_admin bigint,
  role_super_admin bigint
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_year integer := coalesce(p_year, extract(year from now() at time zone 'Asia/Jakarta')::integer);
begin
  if not (public.is_admin() or public.is_super_admin()) then
    raise exception 'Tidak memiliki akses';
  end if;

  return query
  with s as (
    select st.status, public.alumni_account_state(a.profile_id) as akun
    from public.alumni a
    join public.alumni_activity_stats(v_year, now()) st on st.alumni_id = a.id
  )
  select
    v_year,
    v_year < extract(year from now() at time zone 'Asia/Jakarta')::integer,
    count(*),
    count(*) filter (where s.status = 'aktif'),
    count(*) filter (where s.status = 'tidak_aktif'),
    count(*) filter (where s.status = 'tidak_aktif_sementara'),
    count(*) filter (where s.status = 'belum_ada_data'),
    count(*) filter (where s.akun = 'tanpa_akun'),
    count(*) filter (where s.akun = 'undangan_terkirim'),
    count(*) filter (where s.akun = 'menunggu_password'),
    count(*) filter (where s.akun = 'aktif'),
    (select count(*) from public.profiles p where p.role = 'alumni'),
    (select count(*) from public.profiles p where p.role = 'admin'),
    (select count(*) from public.profiles p where p.role = 'super_admin')
  from s;
end;
$$;

revoke execute on function public.monitoring_alumni_summary(integer) from public, anon;
grant execute on function public.monitoring_alumni_summary(integer) to authenticated;

drop function if exists public.monitoring_alumni_by_kecamatan();

create or replace function public.monitoring_alumni_by_kecamatan(p_year integer default null)
returns table (
  kecamatan_id uuid,
  kecamatan_nama text,
  total bigint,
  aktif bigint,
  tidak_aktif bigint,
  sementara bigint,
  belum_ada_data bigint
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
    select a.kecamatan_id, st.status
    from public.alumni a
    join public.alumni_activity_stats(p_year, now()) st on st.alumni_id = a.id
  ),
  per_kecamatan as (
    select k.id as kid, k.nama as knama, 0 as ord,
      count(s.status) as total,
      count(*) filter (where s.status = 'aktif') as aktif,
      count(*) filter (where s.status = 'tidak_aktif') as tidak_aktif,
      count(*) filter (where s.status = 'tidak_aktif_sementara') as sementara,
      count(*) filter (where s.status = 'belum_ada_data') as belum
    from public.kecamatan k
    left join s on s.kecamatan_id = k.id
    group by k.id, k.nama
    union all
    select null::uuid, 'Belum Dipetakan'::text, 1,
      count(*),
      count(*) filter (where s.status = 'aktif'),
      count(*) filter (where s.status = 'tidak_aktif'),
      count(*) filter (where s.status = 'tidak_aktif_sementara'),
      count(*) filter (where s.status = 'belum_ada_data')
    from s
    where s.kecamatan_id is null
  )
  select r.kid, r.knama, r.total, r.aktif, r.tidak_aktif, r.sementara, r.belum
  from per_kecamatan r
  order by r.ord, r.knama;
end;
$$;

revoke execute on function public.monitoring_alumni_by_kecamatan(integer) from public, anon;
grant execute on function public.monitoring_alumni_by_kecamatan(integer) to authenticated;

-- ---------------------------------------------------------------------------
-- 6) Statistik kegiatan & kehadiran (menggantikan versi berbasis
--    status_keanggotaan/wilayah). Hanya kegiatan terlaksana.
-- ---------------------------------------------------------------------------
drop function if exists public.monitoring_overview(integer, uuid, uuid);

create or replace function public.monitoring_overview(p_year integer default null)
returns table (
  tahun integer,
  is_final boolean,
  kegiatan_terlaksana bigint,
  kegiatan_wajib_terlaksana bigint,
  kegiatan_akan_datang bigint,
  hadir bigint,
  tidak_hadir bigint,
  izin bigint,
  sakit bigint,
  tidak_tercatat bigint,
  total_slot bigint,
  tingkat_kehadiran numeric
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_cur_y integer := extract(year from now() at time zone 'Asia/Jakarta')::integer;
  v_year integer := coalesce(p_year, v_cur_y);
begin
  if not (public.is_admin() or public.is_super_admin()) then
    raise exception 'Tidak memiliki akses';
  end if;

  return query
  with s as (select * from public.alumni_event_slots(v_year, now())),
  ev as (
    select e.*
    from public.events e
    where e.status = 'published'
      and extract(year from e.start_at at time zone 'Asia/Jakarta')::integer = v_year
  )
  select
    v_year,
    v_year < v_cur_y,
    (select count(*) from ev where coalesce(ev.end_at, ev.start_at) <= now()),
    (select count(*) from ev where ev.is_mandatory and coalesce(ev.end_at, ev.start_at) <= now()),
    (select count(*) from ev where coalesce(ev.end_at, ev.start_at) > now()),
    (select count(*) from s where s.status = 'HADIR'),
    (select count(*) from s where s.status = 'TIDAK_HADIR'),
    (select count(*) from s where s.status = 'IZIN'),
    (select count(*) from s where s.status = 'SAKIT'),
    (select count(*) from s where s.status is null),
    (select count(*) from s),
    (select case when count(*) = 0 then null
                 else round(count(*) filter (where s.status = 'HADIR') * 100.0 / count(*), 1) end
       from s);
end;
$$;

revoke execute on function public.monitoring_overview(integer) from public, anon;
grant execute on function public.monitoring_overview(integer) to authenticated;

drop function if exists public.monitoring_period_stats(integer, uuid, uuid);

create or replace function public.monitoring_period_stats(p_year integer default null)
returns table (
  month integer,
  akan_datang boolean,
  kegiatan bigint,
  kegiatan_wajib bigint,
  hadir bigint,
  tidak_hadir bigint,
  izin bigint,
  sakit bigint,
  tidak_tercatat bigint,
  tingkat_kehadiran numeric
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_cur_y integer := extract(year from now() at time zone 'Asia/Jakarta')::integer;
  v_cur_m integer := extract(month from now() at time zone 'Asia/Jakarta')::integer;
  v_year integer := coalesce(p_year, v_cur_y);
begin
  if not (public.is_admin() or public.is_super_admin()) then
    raise exception 'Tidak memiliki akses';
  end if;

  return query
  with ev as (
    select
      extract(month from e.start_at at time zone 'Asia/Jakarta')::integer as m,
      count(*) as kegiatan,
      count(*) filter (where e.is_mandatory) as wajib
    from public.events e
    where e.status = 'published'
      and coalesce(e.end_at, e.start_at) <= now()
      and extract(year from e.start_at at time zone 'Asia/Jakarta')::integer = v_year
    group by 1
  ),
  att as (
    select
      s.bulan as m,
      count(*) filter (where s.status = 'HADIR') as hadir,
      count(*) filter (where s.status = 'TIDAK_HADIR') as tidak_hadir,
      count(*) filter (where s.status = 'IZIN') as izin,
      count(*) filter (where s.status = 'SAKIT') as sakit,
      count(*) filter (where s.status is null) as tidak_tercatat,
      count(*) as slot
    from public.alumni_event_slots(v_year, now()) s
    group by s.bulan
  )
  select
    g.m,
    (v_year > v_cur_y or (v_year = v_cur_y and g.m > v_cur_m)),
    coalesce(ev.kegiatan, 0),
    coalesce(ev.wajib, 0),
    coalesce(att.hadir, 0),
    coalesce(att.tidak_hadir, 0),
    coalesce(att.izin, 0),
    coalesce(att.sakit, 0),
    coalesce(att.tidak_tercatat, 0),
    case when coalesce(att.slot, 0) = 0 then null
         else round(att.hadir * 100.0 / att.slot, 1) end
  from generate_series(1, 12) as g(m)
  left join ev on ev.m = g.m
  left join att on att.m = g.m
  order by g.m;
end;
$$;

revoke execute on function public.monitoring_period_stats(integer) from public, anon;
grant execute on function public.monitoring_period_stats(integer) to authenticated;

drop function if exists public.monitoring_recent_events(integer, integer, uuid);

create or replace function public.monitoring_recent_events(
  p_limit integer default 10,
  p_year integer default null,
  p_only_held boolean default false
)
returns table (
  id uuid,
  title text,
  start_at timestamptz,
  end_at timestamptz,
  is_mandatory boolean,
  status_kegiatan text,
  peserta bigint,
  hadir bigint,
  tidak_hadir bigint,
  izin bigint,
  sakit bigint,
  belum_absen bigint,
  tingkat_kehadiran numeric
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_limit integer := greatest(1, least(coalesce(p_limit, 10), 50));
begin
  if not (public.is_admin() or public.is_super_admin()) then
    raise exception 'Tidak memiliki akses';
  end if;

  return query
  with ev as (
    select e.*
    from public.events e
    where e.status = 'published'
      and (p_year is null
           or extract(year from e.start_at at time zone 'Asia/Jakarta')::integer = p_year)
      and (not coalesce(p_only_held, false) or coalesce(e.end_at, e.start_at) <= now())
    order by e.start_at desc
    limit v_limit
  ),
  agg as (
    select
      s.event_id,
      count(*) as peserta,
      count(*) filter (where s.status = 'HADIR') as hadir,
      count(*) filter (where s.status = 'TIDAK_HADIR') as tidak_hadir,
      count(*) filter (where s.status = 'IZIN') as izin,
      count(*) filter (where s.status = 'SAKIT') as sakit,
      count(*) filter (where s.status is null) as belum_absen
    from public.alumni_event_slots(p_year, now()) s
    where s.event_id in (select ev.id from ev)
    group by s.event_id
  )
  select
    ev.id,
    ev.title,
    ev.start_at,
    ev.end_at,
    ev.is_mandatory,
    case
      when coalesce(ev.end_at, ev.start_at) <= now() then 'selesai'
      when ev.start_at <= now() then 'berlangsung'
      else 'akan_datang'
    end,
    coalesce(agg.peserta, 0),
    coalesce(agg.hadir, 0),
    coalesce(agg.tidak_hadir, 0),
    coalesce(agg.izin, 0),
    coalesce(agg.sakit, 0),
    coalesce(agg.belum_absen, 0),
    case when coalesce(agg.peserta, 0) = 0 then null
         else round(agg.hadir * 100.0 / agg.peserta, 1) end
  from ev
  left join agg on agg.event_id = ev.id
  order by ev.start_at desc;
end;
$$;

revoke execute on function public.monitoring_recent_events(integer, integer, boolean) from public, anon;
grant execute on function public.monitoring_recent_events(integer, integer, boolean) to authenticated;

-- Tahun yang tersedia: tahun kegiatan published + tahun berjalan.
create or replace function public.monitoring_available_years()
returns table (year integer)
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
  select t.y
  from (
    select distinct extract(year from e.start_at at time zone 'Asia/Jakarta')::integer as y
    from public.events e
    where e.status = 'published'
    union
    select extract(year from now() at time zone 'Asia/Jakarta')::integer
  ) t
  order by t.y desc;
end;
$$;

-- ---------------------------------------------------------------------------
-- 7) Detail kegiatan (read-only) + peserta.
-- ---------------------------------------------------------------------------
create or replace function public.monitoring_event_detail(p_event_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_event public.events;
  v_result jsonb;
begin
  if not (public.is_admin() or public.is_super_admin()) then
    raise exception 'Tidak memiliki akses';
  end if;

  select * into v_event from public.events e where e.id = p_event_id and e.status = 'published';
  if v_event.id is null then
    raise exception 'Kegiatan tidak ditemukan';
  end if;

  select jsonb_build_object(
    'kegiatan', jsonb_build_object(
      'id', v_event.id,
      'judul', v_event.title,
      'lokasi', v_event.location,
      'mulai', v_event.start_at,
      'selesai', v_event.end_at,
      'wajib', v_event.is_mandatory,
      'absensi_ditutup', v_event.attendance_closed_at,
      'status_kegiatan', case
        when coalesce(v_event.end_at, v_event.start_at) <= now() then 'selesai'
        when v_event.start_at <= now() then 'berlangsung'
        else 'akan_datang'
      end
    ),
    'ringkasan', (
      select jsonb_build_object(
        'peserta', count(*),
        'hadir', count(*) filter (where s.status = 'HADIR'),
        'tidak_hadir', count(*) filter (where s.status = 'TIDAK_HADIR'),
        'izin', count(*) filter (where s.status = 'IZIN'),
        'sakit', count(*) filter (where s.status = 'SAKIT'),
        'belum_absen', count(*) filter (where s.status is null),
        'tingkat_kehadiran', case when count(*) = 0 then null
          else round(count(*) filter (where s.status = 'HADIR') * 100.0 / count(*), 1) end
      )
      from public.alumni_event_slots(null, now(), null, v_event.id) s
    ),
    'peserta', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'alumni_id', a.id,
        'nama', coalesce(nullif(btrim(p.full_name), ''), nullif(btrim(a.nama_lengkap), '')),
        'kecamatan', k.nama,
        'desa_kelurahan', d.nama,
        'angkatan', a.angkatan,
        'status', s.status,
        'waktu_scan', s.scanned_at
      ) order by coalesce(nullif(btrim(p.full_name), ''), nullif(btrim(a.nama_lengkap), ''))), '[]'::jsonb)
      from public.alumni_event_slots(null, now(), null, v_event.id) s
      join public.alumni a on a.id = s.alumni_id
      left join public.profiles p on p.id = a.profile_id
      left join public.kecamatan k on k.id = a.kecamatan_id
      left join public.desa_kelurahan d on d.id = a.desa_kelurahan_id
    )
  ) into v_result;

  return v_result;
end;
$$;

revoke execute on function public.monitoring_event_detail(uuid) from public, anon;
grant execute on function public.monitoring_event_detail(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- 8) Aktivitas terbaru - hanya dari data yang benar-benar tercatat.
-- ---------------------------------------------------------------------------
create or replace function public.monitoring_recent_activity(p_limit integer default 12)
returns table (
  jenis text,
  waktu timestamptz,
  judul text,
  keterangan text,
  alumni_id uuid,
  event_id uuid
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_limit integer := greatest(1, least(coalesce(p_limit, 12), 50));
begin
  if not (public.is_admin() or public.is_super_admin()) then
    raise exception 'Tidak memiliki akses';
  end if;

  return query
  select x.jenis, x.waktu, x.judul, x.keterangan, x.alumni_id, x.event_id
  from (
    -- Scan/pencatatan kehadiran.
    (select
      'absensi'::text as jenis,
      coalesce(ar.scanned_at, ar.updated_at) as waktu,
      coalesce(nullif(btrim(p.full_name), ''), nullif(btrim(a.nama_lengkap), ''), 'Alumni') as judul,
      (case ar.status
        when 'HADIR' then 'Hadir'
        when 'TIDAK_HADIR' then 'Tidak Hadir'
        when 'IZIN' then 'Izin'
        when 'SAKIT' then 'Sakit'
        else ar.status end) || ' · ' || e.title as keterangan,
      a.id as alumni_id,
      e.id as event_id
    from public.attendance_records ar
    join public.alumni a on a.id = ar.alumni_id
    join public.events e on e.id = ar.event_id
    left join public.profiles p on p.id = a.profile_id
    order by coalesce(ar.scanned_at, ar.updated_at) desc
    limit v_limit)

    union all

    -- Kegiatan yang sudah dimulai.
    (select
      'kegiatan'::text,
      e.start_at,
      e.title,
      case when coalesce(e.end_at, e.start_at) <= now() then 'Kegiatan terlaksana'
           else 'Kegiatan berlangsung' end,
      null::uuid,
      e.id
    from public.events e
    where e.status = 'published' and e.start_at <= now()
    order by e.start_at desc
    limit v_limit)

    union all

    -- Audit log: perubahan role, data Alumni, akun, dan penutupan absensi.
    (select
      'sistem'::text,
      l.created_at,
      case l.action
        when 'set_role' then 'Perubahan role'
        when 'create_alumni' then 'Alumni ditambahkan'
        when 'update_alumni' then 'Data Alumni diperbarui'
        when 'delete_alumni' then 'Alumni dihapus'
        when 'link_alumni_account' then 'Akun Alumni dihubungkan'
        when 'close_attendance' then 'Absensi kegiatan ditutup'
        when 'set_alumni_status' then 'Status keanggotaan diubah'
        else l.action
      end,
      case l.action
        when 'set_role' then
          coalesce((select coalesce(nullif(btrim(pp.full_name), ''), aa.nama_lengkap)
                    from public.profiles pp left join public.alumni aa on aa.profile_id = pp.id
                    where pp.id = l.entity_id), 'Akun')
          || ': ' || coalesce(l.metadata->>'old_role', '?') || ' → ' || coalesce(l.metadata->>'new_role', '?')
        when 'delete_alumni' then coalesce(l.metadata->>'nama', 'Alumni')
        when 'close_attendance' then coalesce((select ee.title from public.events ee where ee.id = l.entity_id), 'Kegiatan')
        else coalesce((select coalesce(nullif(btrim(pp.full_name), ''), aa.nama_lengkap)
                       from public.alumni aa left join public.profiles pp on pp.id = aa.profile_id
                       where aa.id = l.entity_id), '')
      end,
      case
        when l.action = 'set_role' then
          (select aa.id from public.alumni aa where aa.profile_id = l.entity_id)
        when l.entity = 'alumni' and l.action <> 'delete_alumni' then
          (select aa.id from public.alumni aa where aa.id = l.entity_id)
      end,
      case when l.entity = 'events' then l.entity_id end
    from public.audit_logs l
    order by l.created_at desc
    limit v_limit)
  ) x
  order by x.waktu desc nulls last
  limit v_limit;
end;
$$;

revoke execute on function public.monitoring_recent_activity(integer) from public, anon;
grant execute on function public.monitoring_recent_activity(integer) to authenticated;

-- ---------------------------------------------------------------------------
-- 9) Pilihan filter Angkatan untuk Admin DAN Super Admin (hanya daftar
--    tahun angkatan, tanpa data pribadi). Signature tetap.
-- ---------------------------------------------------------------------------
create or replace function public.admin_alumni_angkatan_options()
returns table (angkatan smallint)
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
  select distinct a.angkatan
  from public.alumni a
  where a.angkatan is not null
  order by a.angkatan desc;
end;
$$;

revoke execute on function public.admin_alumni_angkatan_options() from public, anon;
grant execute on function public.admin_alumni_angkatan_options() to authenticated;
