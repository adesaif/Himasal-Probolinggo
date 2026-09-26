-- Fase 5: Absensi (Attendance) + QR Code, terhubung ke `events` (Fase 4).
--
-- KEPUTUSAN ARSITEKTUR:
--
-- 1) Satu baris per (event, alumni) di `attendance_records`, bukan satu
--    baris per scan. Constraint unique(event_id, alumni_id) membuat "HADIR
--    dua kali untuk event yang sama" mustahil secara struktural - status
--    diubah lewat UPDATE (koreksi admin), bukan INSERT baris baru.
--
-- 2) QR TIDAK berisi ID alumni maupun data sensitif apa pun. QR hanya
--    berisi token acak (`event_qr_tokens.token`, 32 byte random lewat
--    pgcrypto) yang men-dereference ke SATU event tertentu. Identitas
--    alumni yang absen ditentukan dari sesi login (auth.uid()) saat token
--    di-submit, bukan dari isi QR.
--
-- 3) Alumni TIDAK PERNAH diberi akses SELECT ke `event_qr_tokens` (bukan
--    admin/super_admin akan mendapat 0 baris). Validasi token + pencatatan
--    HADIR sepenuhnya lewat RPC SECURITY DEFINER `submit_attendance`, agar
--    seluruh aturan bisnis (event aktif, periode waktu, alumni aktif, tidak
--    duplikat) ditegakkan di database - bukan hanya disembunyikan di UI.
--
-- 4) Token bersifat short-lived (default 10 menit, admin bisa atur) dan
--    di-rotate: setiap generate token baru otomatis me-revoke token aktif
--    sebelumnya untuk event yang sama, supaya screenshot QR lama tidak
--    bisa dipakai ulang setelah admin refresh QR di layar.
--
-- 5) Penutupan absensi (auto TIDAK_HADIR untuk yang tidak match) HANYA
--    berlaku untuk event `is_mandatory = true`, dan hanya bisa dijalankan
--    admin secara manual SETELAH event selesai (bukan cron/background job -
--    sesuai arahan untuk tidak membuat mekanisme otomatis yang rumit).
--    Idempotent lewat kolom `events.attendance_closed_at`.
--
-- TIDAK ADA tabel/kolom terkait Fiqh di migration ini. TIDAK menyentuh
-- project/aset RuangBerita.

-- ============================================================
-- 1. events: kolom tambahan untuk penutupan absensi
-- ============================================================
alter table public.events
  add column attendance_closed_at timestamptz;

comment on column public.events.attendance_closed_at is
  'Diisi saat admin menutup sesi absensi (lihat admin_close_event_attendance). Mencegah penutupan ganda.';

-- ============================================================
-- 2. attendance_records
-- ============================================================
create table public.attendance_records (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  alumni_id uuid not null references public.alumni (id) on delete cascade,
  status text not null check (status in ('HADIR', 'TIDAK_HADIR', 'IZIN', 'SAKIT')),
  scanned_at timestamptz,
  notes text,
  recorded_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint attendance_records_event_alumni_unique unique (event_id, alumni_id)
);

comment on table public.attendance_records is
  'Kehadiran alumni per event. Satu baris per (event_id, alumni_id) - status diubah lewat UPDATE, bukan INSERT baris baru, sehingga HADIR dua kali untuk event yang sama mustahil secara struktural.';

create trigger set_attendance_records_updated_at
  before update on public.attendance_records
  for each row
  execute function public.set_updated_at();

create index attendance_records_event_id_idx on public.attendance_records (event_id);
create index attendance_records_alumni_id_idx on public.attendance_records (alumni_id);
create index attendance_records_status_idx on public.attendance_records (status);

alter table public.attendance_records enable row level security;

-- Alumni: hanya boleh SELECT baris miliknya sendiri (lookup lewat
-- alumni.profile_id = auth.uid(), bukan alumni_id langsung dari client).
create policy "attendance_select_own"
  on public.attendance_records for select
  to authenticated
  using (
    alumni_id in (select id from public.alumni where profile_id = auth.uid())
  );

-- Admin & Super Admin: SELECT semua baris (Admin untuk mengelola, Super
-- Admin untuk monitoring read-only).
create policy "attendance_select_admin_and_super_admin"
  on public.attendance_records for select
  to authenticated
  using (public.is_admin() or public.is_super_admin());

-- Hanya Admin yang boleh INSERT (koreksi manual, mis. menandai IZIN/SAKIT
-- untuk alumni yang tidak scan QR). Pencatatan HADIR lewat scan QR alumni
-- SELALU lewat RPC submit_attendance (SECURITY DEFINER) di bawah - TIDAK
-- ada policy INSERT untuk role authenticated biasa di sini, supaya alumni
-- tidak bisa insert attendance_records langsung dari client (harus lewat
-- validasi token/periode/duplikat di RPC).
create policy "attendance_insert_admin"
  on public.attendance_records for insert
  to authenticated
  with check (public.is_admin());

-- Hanya Admin yang boleh UPDATE (koreksi status).
create policy "attendance_update_admin"
  on public.attendance_records for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Sengaja TIDAK ADA policy DELETE untuk role mana pun (termasuk Admin).
-- Instruksi eksplisit: "DELETE hanya jika benar-benar diperlukan". Koreksi
-- status dilakukan lewat UPDATE (mis. HADIR -> TIDAK_HADIR), bukan hapus
-- baris, supaya jejak audit tetap ada. Jika suatu saat benar-benar perlu
-- menghapus baris keliru, itu dilakukan manual lewat SQL editor Supabase
-- oleh developer, bukan lewat aplikasi.

-- ============================================================
-- 3. event_qr_tokens
-- ============================================================
create table public.event_qr_tokens (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  token text not null unique,
  expires_at timestamptz not null,
  revoked_at timestamptz,
  created_by uuid references public.profiles (id) default auth.uid(),
  created_at timestamptz not null default now()
);

comment on table public.event_qr_tokens is
  'Token QR absensi per event. Token acak (pgcrypto), TIDAK pernah berisi ID alumni atau data sensitif. Alumni tidak pernah diberi SELECT ke tabel ini - validasi hanya lewat RPC submit_attendance.';

create index event_qr_tokens_event_id_idx on public.event_qr_tokens (event_id);
create index event_qr_tokens_expires_at_idx on public.event_qr_tokens (expires_at);

alter table public.event_qr_tokens enable row level security;

-- Hanya Admin & Super Admin yang boleh SELECT (Admin untuk menampilkan QR
-- aktif di layar, Super Admin read-only untuk audit). Alumni: tidak ada
-- policy sama sekali (default deny).
create policy "event_qr_tokens_select_admin_and_super_admin"
  on public.event_qr_tokens for select
  to authenticated
  using (public.is_admin() or public.is_super_admin());

-- Hanya Admin yang boleh generate QR, dan hanya untuk event yang published
-- serta belum ditutup absensinya - ditegakkan di database (with check),
-- bukan hanya disembunyikan di UI.
create policy "event_qr_tokens_insert_admin"
  on public.event_qr_tokens for insert
  to authenticated
  with check (
    public.is_admin()
    and exists (
      select 1 from public.events e
      where e.id = event_id
        and e.status = 'published'
        and e.attendance_closed_at is null
    )
  );

-- Hanya Admin yang boleh revoke (menonaktifkan QR lebih awal / rotasi saat
-- generate ulang). Super Admin TIDAK boleh generate/revoke QR sama sekali.
create policy "event_qr_tokens_update_admin"
  on public.event_qr_tokens for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ============================================================
-- 4. RPC: submit_attendance - satu-satunya jalur alumni mencatat HADIR.
--    SECURITY DEFINER karena perlu membaca event_qr_tokens (yang tidak
--    boleh diakses langsung oleh alumni) dan menegakkan seluruh urutan
--    validasi di server, bukan di client.
-- ============================================================
create or replace function public.submit_attendance(p_token text)
returns public.attendance_records
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_alumni_id uuid;
  v_alumni_status text;
  v_qr public.event_qr_tokens;
  v_event public.events;
  v_existing public.attendance_records;
  v_record public.attendance_records;
begin
  if auth.uid() is null then
    raise exception 'Anda belum login';
  end if;

  select id, status_keanggotaan
    into v_alumni_id, v_alumni_status
  from public.alumni
  where profile_id = auth.uid();

  if v_alumni_id is null then
    raise exception 'Akun Anda tidak terhubung dengan data alumni';
  end if;

  if v_alumni_status <> 'aktif' then
    raise exception 'Akun tidak aktif';
  end if;

  select * into v_qr
  from public.event_qr_tokens
  where token = p_token;

  if v_qr.id is null then
    raise exception 'QR tidak valid';
  end if;

  if v_qr.revoked_at is not null or v_qr.expires_at < now() then
    raise exception 'QR sudah tidak berlaku';
  end if;

  select * into v_event from public.events where id = v_qr.event_id;

  if v_event.id is null or v_event.status <> 'published' then
    raise exception 'Event tidak aktif';
  end if;

  if now() < v_event.start_at then
    raise exception 'Event belum dimulai';
  end if;

  if v_event.end_at is not null and now() > v_event.end_at then
    raise exception 'Event sudah selesai';
  end if;

  select * into v_existing
  from public.attendance_records
  where event_id = v_event.id and alumni_id = v_alumni_id;

  if v_existing.id is not null then
    raise exception 'Anda sudah melakukan absensi untuk kegiatan ini';
  end if;

  -- Unique constraint sebagai jaring pengaman terakhir terhadap race
  -- condition (mis. dua tab dibuka bersamaan).
  begin
    insert into public.attendance_records (event_id, alumni_id, status, scanned_at, recorded_by)
    values (v_event.id, v_alumni_id, 'HADIR', now(), auth.uid())
    returning * into v_record;
  exception when unique_violation then
    raise exception 'Anda sudah melakukan absensi untuk kegiatan ini';
  end;

  return v_record;
end;
$$;

revoke all on function public.submit_attendance(text) from public, anon, authenticated;
grant execute on function public.submit_attendance(text) to authenticated;

-- ============================================================
-- 5. RPC: admin_close_event_attendance - tandai TIDAK_HADIR untuk alumni
--    aktif yang belum punya record apa pun pada event wajib-hadir yang
--    sudah selesai. Idempotent lewat events.attendance_closed_at.
-- ============================================================
create or replace function public.admin_close_event_attendance(p_event_id uuid)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_event public.events;
  v_count integer;
begin
  if not public.is_admin() then
    raise exception 'Hanya Admin yang boleh menutup absensi';
  end if;

  select * into v_event from public.events where id = p_event_id;

  if v_event.id is null then
    raise exception 'Event tidak ditemukan';
  end if;

  if not v_event.is_mandatory then
    raise exception 'Penutupan absensi otomatis hanya berlaku untuk event yang wajib hadir';
  end if;

  if v_event.attendance_closed_at is not null then
    raise exception 'Absensi untuk event ini sudah ditutup sebelumnya';
  end if;

  if now() < coalesce(v_event.end_at, v_event.start_at) then
    raise exception 'Event belum selesai, absensi belum bisa ditutup';
  end if;

  insert into public.attendance_records (event_id, alumni_id, status, recorded_by)
  select v_event.id, a.id, 'TIDAK_HADIR', auth.uid()
  from public.alumni a
  where a.status_keanggotaan = 'aktif'
    and not exists (
      select 1 from public.attendance_records ar
      where ar.event_id = v_event.id and ar.alumni_id = a.id
    );

  get diagnostics v_count = row_count;

  update public.events set attendance_closed_at = now() where id = v_event.id;

  insert into public.audit_logs (actor_id, action, entity, entity_id, metadata)
  values (
    auth.uid(),
    'close_attendance',
    'events',
    v_event.id,
    jsonb_build_object('marked_tidak_hadir', v_count)
  );

  return v_count;
end;
$$;

revoke all on function public.admin_close_event_attendance(uuid) from public, anon, authenticated;
grant execute on function public.admin_close_event_attendance(uuid) to authenticated;

-- ============================================================
-- 6. RPC: admin_generate_event_qr - generate token acak (pgcrypto),
--    me-rotate (revoke) token aktif sebelumnya untuk event yang sama.
--    Dibungkus RPC (bukan insert langsung dari client) supaya rotasi
--    revoke+insert atomik dalam satu transaksi.
-- ============================================================
create or replace function public.admin_generate_event_qr(
  p_event_id uuid,
  p_ttl_minutes integer default 10
)
returns public.event_qr_tokens
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_event public.events;
  v_ttl integer;
  v_token text;
  v_qr public.event_qr_tokens;
begin
  if not public.is_admin() then
    raise exception 'Hanya Admin yang boleh membuat QR absensi';
  end if;

  select * into v_event from public.events where id = p_event_id;

  if v_event.id is null then
    raise exception 'Event tidak ditemukan';
  end if;

  if v_event.status <> 'published' then
    raise exception 'QR hanya bisa dibuat untuk event yang sudah published';
  end if;

  if v_event.attendance_closed_at is not null then
    raise exception 'Absensi untuk event ini sudah ditutup';
  end if;

  v_ttl := greatest(1, least(coalesce(p_ttl_minutes, 10), 180));
  v_token := encode(extensions.gen_random_bytes(32), 'base64');
  v_token := replace(replace(replace(v_token, '+', '-'), '/', '_'), '=', '');

  update public.event_qr_tokens
  set revoked_at = now()
  where event_id = p_event_id and revoked_at is null and expires_at > now();

  insert into public.event_qr_tokens (event_id, token, expires_at, created_by)
  values (p_event_id, v_token, now() + make_interval(mins => v_ttl), auth.uid())
  returning * into v_qr;

  return v_qr;
end;
$$;

revoke all on function public.admin_generate_event_qr(uuid, integer) from public, anon, authenticated;
grant execute on function public.admin_generate_event_qr(uuid, integer) to authenticated;

-- ============================================================
-- 7. RPC: admin_revoke_event_qr - nonaktifkan QR aktif lebih awal.
-- ============================================================
create or replace function public.admin_revoke_event_qr(p_event_id uuid)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count integer;
begin
  if not public.is_admin() then
    raise exception 'Hanya Admin yang boleh menonaktifkan QR absensi';
  end if;

  update public.event_qr_tokens
  set revoked_at = now()
  where event_id = p_event_id and revoked_at is null;

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

revoke all on function public.admin_revoke_event_qr(uuid) from public, anon, authenticated;
grant execute on function public.admin_revoke_event_qr(uuid) to authenticated;
