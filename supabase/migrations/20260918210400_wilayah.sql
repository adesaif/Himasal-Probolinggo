-- Fase 0: master data wilayah. Tabel (bukan enum) supaya wilayah baru bisa
-- ditambahkan Admin di kemudian hari tanpa migration.

create table public.wilayah (
  id uuid primary key default gen_random_uuid(),
  nama text not null unique,
  kode text unique,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

insert into public.wilayah (nama, kode) values
  ('Probolinggo Barat', 'PBL-BARAT'),
  ('Probolinggo Tengah', 'PBL-TENGAH'),
  ('Probolinggo Timur', 'PBL-TIMUR');

alter table public.wilayah enable row level security;

-- Dibaca oleh semua user login (dipakai di form data alumni & filter
-- laporan). Publik (anon) belum perlu akses karena belum ada halaman publik
-- yang menampilkan data alumni per wilayah.
create policy "wilayah_select_authenticated"
  on public.wilayah for select
  to authenticated
  using (true);

-- Hanya Admin yang boleh menambah/mengubah wilayah. Super Admin read-only.
create policy "wilayah_insert_admin"
  on public.wilayah for insert
  to authenticated
  with check (public.is_admin());

create policy "wilayah_update_admin"
  on public.wilayah for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());
