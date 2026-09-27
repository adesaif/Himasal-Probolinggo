-- Revisi modul Admin -> Alumni: alamat terstruktur Kecamatan -> Desa/
-- Kelurahan, status otomatis dari absensi, tambah/edit/hapus alumni tanpa
-- email.
--
-- KEPUTUSAN ARSITEKTUR:
--
-- 1) Master lokasi (24 kecamatan Kabupaten Probolinggo + desa/kelurahan
--    masing-masing) disimpan sebagai TABEL (`kecamatan`, `desa_kelurahan`),
--    bukan konstanta di kode - satu sumber data yang dipakai bersama oleh
--    filter daftar alumni, form Tambah, dan form Edit. `jenis` membedakan
--    desa vs kelurahan; `urutan` mempertahankan urutan dari daftar resmi.
--    Nama desa boleh sama di kecamatan berbeda (mis. Patokan, Tamansari,
--    Pesisir, Wonorejo) - unik per kecamatan, bukan global.
--
-- 2) `alumni.kecamatan_id` + `alumni.desa_kelurahan_id` (nullable,
--    additive). Composite FK (desa_kelurahan_id, kecamatan_id) ->
--    desa_kelurahan(id, kecamatan_id) menjamin di level database bahwa desa
--    yang dipilih memang milik kecamatan tersebut; check constraint
--    melarang desa tanpa kecamatan (composite FK MATCH SIMPLE tidak
--    memeriksa baris yang salah satu kolomnya NULL).
--
-- 3) Data lama TIDAK diubah: kolom `wilayah_id` (Probolinggo Barat/Tengah/
--    Timur) dan `alamat` (teks bebas) tetap ada dan tetap dipakai modul lain
--    (dashboard utama, monitoring, profil alumni). Tidak ada backfill
--    otomatis - wilayah lama tidak bisa dipetakan ke kecamatan/desa secara
--    jujur, jadi alumni lama tampil "alamat belum dipetakan" sampai Admin
--    mengisinya lewat Edit.
--
-- 4) Alumni kini bisa dibuat Admin TANPA akun login (email dihapus dari
--    form). Nama & nomor HP selama ini hanya ada di `profiles` (butuh
--    auth.users), jadi ditambahkan `alumni.nama_lengkap` + `alumni.no_hp`.
--    Nama tampilan = coalesce(profiles.full_name, alumni.nama_lengkap);
--    admin_save_alumni menulis ke keduanya kalau alumni punya akun, supaya
--    tidak pernah berbeda.
--
-- 5) Status Aktif/Nonaktif di Admin -> Alumni DIHITUNG, tidak disimpan:
--    Aktif = punya minimal satu attendance_records berstatus 'HADIR'
--    (satu-satunya bukti "pernah mengikuti agenda" di sistem - tidak ada
--    tabel pendaftaran agenda terpisah; TIDAK_HADIR/IZIN/SAKIT bukan
--    keikutsertaan). Satu fungsi `alumni_is_aktif` = satu sumber aturan.
--    Kolom lama `status_keanggotaan` TIDAK dihapus/diubah karena masih
--    dipakai modul absensi (submit_attendance, admin_close_event_attendance)
--    dan statistik dashboard/monitoring.
--
-- 6) Hapus alumni lewat RPC admin_delete_alumni (tidak ada policy DELETE
--    langsung). FK attendance_records.alumni_id memang dirancang ON DELETE
--    CASCADE sejak Fase 5 - riwayat absensi alumni tsb ikut terhapus; UI
--    menampilkan jumlahnya di dialog konfirmasi. Akun login (profiles/
--    auth.users) TIDAK ikut dihapus (alumni.profile_id -> profiles, bukan
--    sebaliknya).
--
-- Tidak ada DROP table/column, tidak ada perubahan pada tabel modul lain.

-- ============================================================
-- 1. Master lokasi
-- ============================================================
create table public.kecamatan (
  id uuid primary key default gen_random_uuid(),
  nama text not null unique,
  created_at timestamptz not null default now()
);

create table public.desa_kelurahan (
  id uuid primary key default gen_random_uuid(),
  kecamatan_id uuid not null references public.kecamatan (id) on delete restrict,
  nama text not null,
  jenis text not null check (jenis in ('desa', 'kelurahan')),
  urutan smallint not null default 0,
  created_at timestamptz not null default now(),
  constraint desa_kelurahan_kecamatan_nama_unique unique (kecamatan_id, nama),
  -- target composite FK dari alumni (lihat catatan 2)
  constraint desa_kelurahan_id_kecamatan_unique unique (id, kecamatan_id)
);

create index desa_kelurahan_kecamatan_id_idx on public.desa_kelurahan (kecamatan_id);

alter table public.kecamatan enable row level security;
alter table public.desa_kelurahan enable row level security;

-- Master data: dibaca semua user login (form & filter). Tidak ada policy
-- insert/update/delete - daftar resmi dikelola lewat migration.
create policy "kecamatan_select_authenticated"
  on public.kecamatan for select
  to authenticated
  using (true);

create policy "desa_kelurahan_select_authenticated"
  on public.desa_kelurahan for select
  to authenticated
  using (true);

insert into public.kecamatan (nama) values
  ('Bantaran'),
  ('Banyuanyar'),
  ('Besuk'),
  ('Dringu'),
  ('Gading'),
  ('Gending'),
  ('Kotaanyar'),
  ('Kraksaan'),
  ('Krejengan'),
  ('Krucil'),
  ('Kuripan'),
  ('Leces'),
  ('Lumbang'),
  ('Maron'),
  ('Paiton'),
  ('Pakuniran'),
  ('Pajarakan'),
  ('Sukapura'),
  ('Sumber'),
  ('Sumberasih'),
  ('Tegalsiwalan'),
  ('Tiris'),
  ('Tongas'),
  ('Wonomerto')
on conflict (nama) do nothing;

insert into public.desa_kelurahan (kecamatan_id, nama, jenis, urutan)
select k.id, v.nama, v.jenis, v.urutan
from (values
  ('Bantaran', 'Bantaran', 'desa', 1),
  ('Bantaran', 'Besuk', 'desa', 2),
  ('Bantaran', 'Gunung Tugel', 'desa', 3),
  ('Bantaran', 'Karang Anyar', 'desa', 4),
  ('Bantaran', 'Kedungrejo', 'desa', 5),
  ('Bantaran', 'Kramat Agung', 'desa', 6),
  ('Bantaran', 'Kropak', 'desa', 7),
  ('Bantaran', 'Legundi', 'desa', 8),
  ('Bantaran', 'Patokan', 'desa', 9),
  ('Bantaran', 'Tempuran', 'desa', 10),
  ('Banyuanyar', 'Alassapi', 'desa', 1),
  ('Banyuanyar', 'Banyuanyar Kidul', 'desa', 2),
  ('Banyuanyar', 'Banyuanyar Tengah', 'desa', 3),
  ('Banyuanyar', 'Blado Wetan', 'desa', 4),
  ('Banyuanyar', 'Gading Kulon', 'desa', 5),
  ('Banyuanyar', 'Gunung Geni', 'desa', 6),
  ('Banyuanyar', 'Klenang Kidul', 'desa', 7),
  ('Banyuanyar', 'Klenang Lor', 'desa', 8),
  ('Banyuanyar', 'Liprak Kidul', 'desa', 9),
  ('Banyuanyar', 'Liprak Kulon', 'desa', 10),
  ('Banyuanyar', 'Liprak Wetan', 'desa', 11),
  ('Banyuanyar', 'Pendil', 'desa', 12),
  ('Banyuanyar', 'Sentulan', 'desa', 13),
  ('Banyuanyar', 'Tarokan', 'desa', 14),
  ('Besuk', 'Alas Kandang', 'desa', 1),
  ('Besuk', 'Alas Nyiur', 'desa', 2),
  ('Besuk', 'Alas Sumur Lor', 'desa', 3),
  ('Besuk', 'Alas Tengah', 'desa', 4),
  ('Besuk', 'Bago', 'desa', 5),
  ('Besuk', 'Besuk Agung', 'desa', 6),
  ('Besuk', 'Besuk Kidul', 'desa', 7),
  ('Besuk', 'Jambangan', 'desa', 8),
  ('Besuk', 'Kecik', 'desa', 9),
  ('Besuk', 'Klampokan', 'desa', 10),
  ('Besuk', 'Krampilan', 'desa', 11),
  ('Besuk', 'Matekan', 'desa', 12),
  ('Besuk', 'Randu Jalak', 'desa', 13),
  ('Besuk', 'Sindet Anyar', 'desa', 14),
  ('Besuk', 'Sindet Lami', 'desa', 15),
  ('Besuk', 'Sumberan', 'desa', 16),
  ('Besuk', 'Sumur Dalam', 'desa', 17),
  ('Dringu', 'Dringu', 'desa', 1),
  ('Dringu', 'Kalirejo', 'desa', 2),
  ('Dringu', 'Kalisalam', 'desa', 3),
  ('Dringu', 'Kedungdalem', 'desa', 4),
  ('Dringu', 'Mranggon Lawang', 'desa', 5),
  ('Dringu', 'Ngepoh', 'desa', 6),
  ('Dringu', 'Pabean', 'desa', 7),
  ('Dringu', 'Randuputih', 'desa', 8),
  ('Dringu', 'Sekarkare', 'desa', 9),
  ('Dringu', 'Sumberagung', 'desa', 10),
  ('Dringu', 'Sumbersuko', 'desa', 11),
  ('Dringu', 'Tamansari', 'desa', 12),
  ('Dringu', 'Tegalrejo', 'desa', 13),
  ('Dringu', 'Watuwungkuk', 'desa', 14),
  ('Gading', 'Batur', 'desa', 1),
  ('Gading', 'Betek Taman', 'desa', 2),
  ('Gading', 'Bulupandak', 'desa', 3),
  ('Gading', 'Condong', 'desa', 4),
  ('Gading', 'Dandang', 'desa', 5),
  ('Gading', 'Duren', 'desa', 6),
  ('Gading', 'Gading Wetan', 'desa', 7),
  ('Gading', 'Jurangjero', 'desa', 8),
  ('Gading', 'Kaliancar', 'desa', 9),
  ('Gading', 'Keben', 'desa', 10),
  ('Gading', 'Kertosono', 'desa', 11),
  ('Gading', 'Mojolegi', 'desa', 12),
  ('Gading', 'Nogosaren', 'desa', 13),
  ('Gading', 'Prasi', 'desa', 14),
  ('Gading', 'Ranuwurung', 'desa', 15),
  ('Gading', 'Renteng', 'desa', 16),
  ('Gading', 'Sentul', 'desa', 17),
  ('Gading', 'Sumbersecang', 'desa', 18),
  ('Gading', 'Wangkal', 'desa', 19),
  ('Gending', 'Banyuanyar Lor', 'desa', 1),
  ('Gending', 'Brumbungan Lor', 'desa', 2),
  ('Gending', 'Bulang', 'desa', 3),
  ('Gending', 'Curahsawo', 'desa', 4),
  ('Gending', 'Gending', 'desa', 5),
  ('Gending', 'Jatiadi', 'desa', 6),
  ('Gending', 'Klaseman', 'desa', 7),
  ('Gending', 'Pajurangan', 'desa', 8),
  ('Gending', 'Pesisir', 'desa', 9),
  ('Gending', 'Pikatan', 'desa', 10),
  ('Gending', 'Randupitu', 'desa', 11),
  ('Gending', 'Sebaung', 'desa', 12),
  ('Gending', 'Sumberkerang', 'desa', 13),
  ('Kotaanyar', 'Curahtemu', 'desa', 1),
  ('Kotaanyar', 'Kedungrejoso', 'desa', 2),
  ('Kotaanyar', 'Kotaanyar', 'desa', 3),
  ('Kotaanyar', 'Pasembon', 'desa', 4),
  ('Kotaanyar', 'Sambirampak Kidul', 'desa', 5),
  ('Kotaanyar', 'Sambirampak Lor', 'desa', 6),
  ('Kotaanyar', 'Sidomulyo', 'desa', 7),
  ('Kotaanyar', 'Sidorejo', 'desa', 8),
  ('Kotaanyar', 'Sukorejo', 'desa', 9),
  ('Kotaanyar', 'Sumbercenteng', 'desa', 10),
  ('Kotaanyar', 'Talkandang', 'desa', 11),
  ('Kotaanyar', 'Tambakukir', 'desa', 12),
  ('Kotaanyar', 'Triwungan', 'desa', 13),
  ('Kraksaan', 'Rondokuning', 'desa', 1),
  ('Kraksaan', 'Kregenan', 'desa', 2),
  ('Kraksaan', 'Bulu', 'desa', 3),
  ('Kraksaan', 'Asembagus', 'desa', 4),
  ('Kraksaan', 'Kalibuntu', 'desa', 5),
  ('Kraksaan', 'Sidopekso', 'desa', 6),
  ('Kraksaan', 'Kebonagung', 'desa', 7),
  ('Kraksaan', 'Sumberlele', 'desa', 8),
  ('Kraksaan', 'Tamansari', 'desa', 9),
  ('Kraksaan', 'Kandangjati Wetan', 'desa', 10),
  ('Kraksaan', 'Alassumur Kulon', 'desa', 11),
  ('Kraksaan', 'Asembakor', 'desa', 12),
  ('Kraksaan', 'Rangkang', 'desa', 13),
  ('Kraksaan', 'Semampir', 'kelurahan', 14),
  ('Kraksaan', 'Patokan', 'kelurahan', 15),
  ('Kraksaan', 'Sidomukti', 'kelurahan', 16),
  ('Kraksaan', 'Kraksaan Wetan', 'kelurahan', 17),
  ('Kraksaan', 'Kandangjati Kulon', 'kelurahan', 18),
  ('Krejengan', 'Duwuhan', 'desa', 1),
  ('Krejengan', 'Gebangan', 'desa', 2),
  ('Krejengan', 'Jatiurip', 'desa', 3),
  ('Krejengan', 'Kamalkuning', 'desa', 4),
  ('Krejengan', 'Karangren', 'desa', 5),
  ('Krejengan', 'Kebuncaruk', 'desa', 6),
  ('Krejengan', 'Krejengan', 'desa', 7),
  ('Krejengan', 'Opo-Opo', 'desa', 8),
  ('Krejengan', 'Patemon', 'desa', 9),
  ('Krejengan', 'Rawan', 'desa', 10),
  ('Krejengan', 'Seboro', 'desa', 11),
  ('Krejengan', 'Sentong', 'desa', 12),
  ('Krejengan', 'Sokaan', 'desa', 13),
  ('Krejengan', 'Sumberkatimoho', 'desa', 14),
  ('Krejengan', 'Tanjungsari', 'desa', 15),
  ('Krejengan', 'Temenggungan', 'desa', 16),
  ('Krejengan', 'Widoro', 'desa', 17),
  ('Krucil', 'Bermi', 'desa', 1),
  ('Krucil', 'Betek', 'desa', 2),
  ('Krucil', 'Guyangan', 'desa', 3),
  ('Krucil', 'Kalianan', 'desa', 4),
  ('Krucil', 'Kertosuko', 'desa', 5),
  ('Krucil', 'Krobungan', 'desa', 6),
  ('Krucil', 'Krucil', 'desa', 7),
  ('Krucil', 'Pandanlaras', 'desa', 8),
  ('Krucil', 'Plaosan', 'desa', 9),
  ('Krucil', 'Roto', 'desa', 10),
  ('Krucil', 'Seneng', 'desa', 11),
  ('Krucil', 'Sumberduren', 'desa', 12),
  ('Krucil', 'Tambelang', 'desa', 13),
  ('Krucil', 'Watupanjang', 'desa', 14),
  ('Kuripan', 'Jatisari', 'desa', 1),
  ('Kuripan', 'Karangrejo', 'desa', 2),
  ('Kuripan', 'Kedawung', 'desa', 3),
  ('Kuripan', 'Menyono', 'desa', 4),
  ('Kuripan', 'Resongo', 'desa', 5),
  ('Kuripan', 'Wonoasri', 'desa', 6),
  ('Kuripan', 'Wringinanom', 'desa', 7),
  ('Leces', 'Clarak', 'desa', 1),
  ('Leces', 'Jorongan', 'desa', 2),
  ('Leces', 'Kerpangan', 'desa', 3),
  ('Leces', 'Leces', 'desa', 4),
  ('Leces', 'Malasan Kulon', 'desa', 5),
  ('Leces', 'Pondokwuluh', 'desa', 6),
  ('Leces', 'Sumberkedawung', 'desa', 7),
  ('Leces', 'Tigasan Kulon', 'desa', 8),
  ('Leces', 'Tigasan Wetan', 'desa', 9),
  ('Leces', 'Warujinggo', 'desa', 10),
  ('Lumbang', 'Boto', 'desa', 1),
  ('Lumbang', 'Branggah', 'desa', 2),
  ('Lumbang', 'Lambangkuning', 'desa', 3),
  ('Lumbang', 'Lumbang', 'desa', 4),
  ('Lumbang', 'Negororejo', 'desa', 5),
  ('Lumbang', 'Palangbesi', 'desa', 6),
  ('Lumbang', 'Purut', 'desa', 7),
  ('Lumbang', 'Sapih', 'desa', 8),
  ('Lumbang', 'Tandonsentul', 'desa', 9),
  ('Lumbang', 'Wonogoro', 'desa', 10),
  ('Maron', 'Brabe', 'desa', 1),
  ('Maron', 'Brani Kulon', 'desa', 2),
  ('Maron', 'Brani Wetan', 'desa', 3),
  ('Maron', 'Brumbungan Kidul', 'desa', 4),
  ('Maron', 'Ganting Kulon', 'desa', 5),
  ('Maron', 'Ganting Wetan', 'desa', 6),
  ('Maron', 'Gerongan', 'desa', 7),
  ('Maron', 'Kedungsari', 'desa', 8),
  ('Maron', 'Maron Kidul', 'desa', 9),
  ('Maron', 'Maron Kulon', 'desa', 10),
  ('Maron', 'Maron Wetan', 'desa', 11),
  ('Maron', 'Pegalangan Kidul', 'desa', 12),
  ('Maron', 'Puspan', 'desa', 13),
  ('Maron', 'Satreyan', 'desa', 14),
  ('Maron', 'Suko', 'desa', 15),
  ('Maron', 'Sumberdawe', 'desa', 16),
  ('Maron', 'Sumberpoh', 'desa', 17),
  ('Maron', 'Wonorejo', 'desa', 18),
  ('Paiton', 'Alastengah', 'desa', 1),
  ('Paiton', 'Bhinor', 'desa', 2),
  ('Paiton', 'Jabung Candi', 'desa', 3),
  ('Paiton', 'Jabung Sisir', 'desa', 4),
  ('Paiton', 'Jabung Wetan', 'desa', 5),
  ('Paiton', 'Kalikajar Kulon', 'desa', 6),
  ('Paiton', 'Kalikajar Wetan', 'desa', 7),
  ('Paiton', 'Karanganyar', 'desa', 8),
  ('Paiton', 'Paiton', 'desa', 9),
  ('Paiton', 'Pandean', 'desa', 10),
  ('Paiton', 'Petunjungan', 'desa', 11),
  ('Paiton', 'Plampang', 'desa', 12),
  ('Paiton', 'Pondokkelor', 'desa', 13),
  ('Paiton', 'Randumerak', 'desa', 14),
  ('Paiton', 'Randutatah', 'desa', 15),
  ('Paiton', 'Sidodadi', 'desa', 16),
  ('Paiton', 'Sukodadi', 'desa', 17),
  ('Paiton', 'Sumberanyar', 'desa', 18),
  ('Paiton', 'Sumberrejo', 'desa', 19),
  ('Paiton', 'Taman', 'desa', 20),
  ('Pakuniran', 'Alas Pandan', 'desa', 1),
  ('Pakuniran', 'Bimo', 'desa', 2),
  ('Pakuniran', 'Blimbing', 'desa', 3),
  ('Pakuniran', 'Bucor Kulon', 'desa', 4),
  ('Pakuniran', 'Bucor Wetan', 'desa', 5),
  ('Pakuniran', 'Glagah', 'desa', 6),
  ('Pakuniran', 'Gondosuli', 'desa', 7),
  ('Pakuniran', 'Gunggungan Kidul', 'desa', 8),
  ('Pakuniran', 'Gunggungan Lor', 'desa', 9),
  ('Pakuniran', 'Kalidandan', 'desa', 10),
  ('Pakuniran', 'Kedungsumur', 'desa', 11),
  ('Pakuniran', 'Kertonegoro', 'desa', 12),
  ('Pakuniran', 'Pakuniran', 'desa', 13),
  ('Pakuniran', 'Patemon Kulon', 'desa', 14),
  ('Pakuniran', 'Ranon', 'desa', 15),
  ('Pakuniran', 'Sogaan', 'desa', 16),
  ('Pakuniran', 'Sumberkembar', 'desa', 17),
  ('Pajarakan', 'Gejugan', 'desa', 1),
  ('Pajarakan', 'Karangbong', 'desa', 2),
  ('Pajarakan', 'Karanggeger', 'desa', 3),
  ('Pajarakan', 'Karangpranti', 'desa', 4),
  ('Pajarakan', 'Ketompen', 'desa', 5),
  ('Pajarakan', 'Pajarakan Kulon', 'desa', 6),
  ('Pajarakan', 'Penambangan', 'desa', 7),
  ('Pajarakan', 'Selogudig Kulon', 'desa', 8),
  ('Pajarakan', 'Selogudig Wetan', 'desa', 9),
  ('Pajarakan', 'Sukokerto', 'desa', 10),
  ('Pajarakan', 'Sukomulyo', 'desa', 11),
  ('Pajarakan', 'Tanjung', 'desa', 12),
  ('Sukapura', 'Jetak', 'desa', 1),
  ('Sukapura', 'Kedasih', 'desa', 2),
  ('Sukapura', 'Ngadas', 'desa', 3),
  ('Sukapura', 'Ngadirejo', 'desa', 4),
  ('Sukapura', 'Ngadisari', 'desa', 5),
  ('Sukapura', 'Ngepung', 'desa', 6),
  ('Sukapura', 'Pakel', 'desa', 7),
  ('Sukapura', 'Sapikerep', 'desa', 8),
  ('Sukapura', 'Sariwani', 'desa', 9),
  ('Sukapura', 'Sukapura', 'desa', 10),
  ('Sukapura', 'Wonokerto', 'desa', 11),
  ('Sukapura', 'Wonotoro', 'desa', 12),
  ('Sumber', 'Cepoko', 'desa', 1),
  ('Sumber', 'Gemito', 'desa', 2),
  ('Sumber', 'Ledokombo', 'desa', 3),
  ('Sumber', 'Pandansari', 'desa', 4),
  ('Sumber', 'Rambaan', 'desa', 5),
  ('Sumber', 'Sumber', 'desa', 6),
  ('Sumber', 'Sumberanom', 'desa', 7),
  ('Sumber', 'Tukul', 'desa', 8),
  ('Sumber', 'Wonokerso', 'desa', 9),
  ('Sumberasih', 'Ambulu', 'desa', 1),
  ('Sumberasih', 'Banjarsari', 'desa', 2),
  ('Sumberasih', 'Gili Ketapang', 'desa', 3),
  ('Sumberasih', 'Jangur', 'desa', 4),
  ('Sumberasih', 'Laweyan', 'desa', 5),
  ('Sumberasih', 'Lemahkembar', 'desa', 6),
  ('Sumberasih', 'Mentor', 'desa', 7),
  ('Sumberasih', 'Muneng', 'desa', 8),
  ('Sumberasih', 'Muneng Kidul', 'desa', 9),
  ('Sumberasih', 'Pesisir', 'desa', 10),
  ('Sumberasih', 'Pohsangit Leres', 'desa', 11),
  ('Sumberasih', 'Sumberbendo', 'desa', 12),
  ('Sumberasih', 'Sumurmati', 'desa', 13),
  ('Tegalsiwalan', 'Banjarsawah', 'desa', 1),
  ('Tegalsiwalan', 'Blado Kulon', 'desa', 2),
  ('Tegalsiwalan', 'Bulujaran Kidul', 'desa', 3),
  ('Tegalsiwalan', 'Bulujaran Lor', 'desa', 4),
  ('Tegalsiwalan', 'Gunung Bekel', 'desa', 5),
  ('Tegalsiwalan', 'Malasan Wetan', 'desa', 6),
  ('Tegalsiwalan', 'Paras', 'desa', 7),
  ('Tegalsiwalan', 'Sumberbulu', 'desa', 8),
  ('Tegalsiwalan', 'Sumberkledung', 'desa', 9),
  ('Tegalsiwalan', 'Tegalmojo', 'desa', 10),
  ('Tegalsiwalan', 'Tegalsiwalan', 'desa', 11),
  ('Tegalsiwalan', 'Tegalsono', 'desa', 12),
  ('Tiris', 'Andungbiru', 'desa', 1),
  ('Tiris', 'Andungsari', 'desa', 2),
  ('Tiris', 'Jangkang', 'desa', 3),
  ('Tiris', 'Pedagangan', 'desa', 4),
  ('Tiris', 'Pesawahan', 'desa', 5),
  ('Tiris', 'Racek', 'desa', 6),
  ('Tiris', 'Ranuagung', 'desa', 7),
  ('Tiris', 'Ranugedang', 'desa', 8),
  ('Tiris', 'Rejing', 'desa', 9),
  ('Tiris', 'Segaran', 'desa', 10),
  ('Tiris', 'Tegalwatu', 'desa', 11),
  ('Tiris', 'Tiris', 'desa', 12),
  ('Tiris', 'Tlogoargo', 'desa', 13),
  ('Tiris', 'Tlogosari', 'desa', 14),
  ('Tiris', 'Tulupari', 'desa', 15),
  ('Tiris', 'Wedusan', 'desa', 16),
  ('Tongas', 'Bayeman', 'desa', 1),
  ('Tongas', 'Curah Dringu', 'desa', 2),
  ('Tongas', 'Curah Tulis', 'desa', 3),
  ('Tongas', 'Dungun', 'desa', 4),
  ('Tongas', 'Klampok', 'desa', 5),
  ('Tongas', 'Pamatan', 'desa', 6),
  ('Tongas', 'Sumberrejo', 'desa', 7),
  ('Tongas', 'Sumberkramat', 'desa', 8),
  ('Tongas', 'Sumendi', 'desa', 9),
  ('Tongas', 'Tambakrejo', 'desa', 10),
  ('Tongas', 'Tanjungrejo', 'desa', 11),
  ('Tongas', 'Tongas Kulon', 'desa', 12),
  ('Tongas', 'Tongas Wetan', 'desa', 13),
  ('Tongas', 'Wringinanom', 'desa', 14),
  ('Wonomerto', 'Jrebeng', 'desa', 1),
  ('Wonomerto', 'Kareng Kidul', 'desa', 2),
  ('Wonomerto', 'Kedungsupit', 'desa', 3),
  ('Wonomerto', 'Patalan', 'desa', 4),
  ('Wonomerto', 'Pohsangit Lor', 'desa', 5),
  ('Wonomerto', 'Pohsangit Ngisor', 'desa', 6),
  ('Wonomerto', 'Pohsangit Tengah', 'desa', 7),
  ('Wonomerto', 'Sepuhgembol', 'desa', 8),
  ('Wonomerto', 'Sumberkare', 'desa', 9),
  ('Wonomerto', 'Tunggak Cerme', 'desa', 10),
  ('Wonomerto', 'Wonorejo', 'desa', 11)
) as v(kecamatan, nama, jenis, urutan)
join public.kecamatan k on k.nama = v.kecamatan
on conflict (kecamatan_id, nama) do nothing;

-- ============================================================
-- 2. Kolom baru alumni (additive, nullable)
-- ============================================================
alter table public.alumni
  add column nama_lengkap text,
  add column no_hp text,
  add column kecamatan_id uuid references public.kecamatan (id) on delete restrict,
  add column desa_kelurahan_id uuid,
  add constraint alumni_desa_kelurahan_fkey
    foreign key (desa_kelurahan_id, kecamatan_id)
    references public.desa_kelurahan (id, kecamatan_id) on delete restrict,
  add constraint alumni_desa_requires_kecamatan
    check (desa_kelurahan_id is null or kecamatan_id is not null);

comment on column public.alumni.nama_lengkap is
  'Nama alumni tanpa akun login. Kalau alumni punya akun, profiles.full_name yang diutamakan (admin_save_alumni menulis keduanya).';
comment on column public.alumni.kecamatan_id is
  'Alamat terstruktur (menggantikan wilayah Barat/Tengah/Timur di Admin -> Alumni). wilayah_id & alamat lama tetap dipertahankan.';

create index alumni_kecamatan_id_idx on public.alumni (kecamatan_id);
create index alumni_desa_kelurahan_id_idx on public.alumni (desa_kelurahan_id);

-- ============================================================
-- 3. Status otomatis - satu sumber aturan
-- ============================================================
create or replace function public.alumni_is_aktif(p_alumni_id uuid)
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select exists (
    select 1
    from public.attendance_records ar
    where ar.alumni_id = p_alumni_id
      and ar.status = 'HADIR'
  );
$$;

revoke execute on function public.alumni_is_aktif(uuid) from public, anon;
grant execute on function public.alumni_is_aktif(uuid) to authenticated;

-- ============================================================
-- 4. Daftar alumni: search + filter server-side, satu query
-- ============================================================
-- SECURITY INVOKER: tetap tunduk pada RLS (alumni/profiles/attendance
-- hanya terbaca penuh oleh Admin) + cek is_admin eksplisit.
create or replace function public.admin_list_alumni(
  p_search text default null,
  p_kecamatan_id uuid default null,
  p_desa_kelurahan_id uuid default null,
  p_status text default null,
  p_angkatan smallint default null,
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
  is_aktif boolean,
  has_account boolean,
  jumlah_absensi bigint,
  total_count bigint
)
language plpgsql
stable
security invoker
set search_path = ''
as $$
#variable_conflict use_column
declare
  v_search text := nullif(btrim(coalesce(p_search, '')), '');
begin
  if not public.is_admin() then
    raise exception 'Hanya Admin yang boleh melihat data alumni';
  end if;

  if p_status is not null and p_status not in ('aktif', 'nonaktif') then
    raise exception 'Status filter tidak valid';
  end if;

  -- Karakter wildcard ILIKE dari input di-escape supaya "50%" dicari
  -- literal, bukan sebagai pola.
  if v_search is not null then
    v_search := replace(replace(replace(v_search, '\', '\\'), '%', '\%'), '_', '\_');
  end if;

  return query
  with base as (
    select
      a.id,
      coalesce(nullif(btrim(p.full_name), ''), nullif(btrim(a.nama_lengkap), '')) as nama,
      coalesce(nullif(btrim(p.phone), ''), nullif(btrim(a.no_hp), '')) as no_hp,
      a.angkatan,
      a.kecamatan_id,
      k.nama as kecamatan_nama,
      a.desa_kelurahan_id,
      d.nama as desa_kelurahan_nama,
      d.jenis as desa_kelurahan_jenis,
      public.alumni_is_aktif(a.id) as is_aktif,
      (a.profile_id is not null) as has_account,
      a.created_at
    from public.alumni a
    left join public.profiles p on p.id = a.profile_id
    left join public.kecamatan k on k.id = a.kecamatan_id
    left join public.desa_kelurahan d on d.id = a.desa_kelurahan_id
    where (p_kecamatan_id is null or a.kecamatan_id = p_kecamatan_id)
      and (p_desa_kelurahan_id is null or a.desa_kelurahan_id = p_desa_kelurahan_id)
      and (p_angkatan is null or a.angkatan = p_angkatan)
  ),
  filtered as (
    select b.*, count(*) over () as total_count
    from base b
    where (v_search is null or b.nama ilike '%' || v_search || '%')
      and (p_status is null or b.is_aktif = (p_status = 'aktif'))
    order by lower(b.nama) asc nulls last, b.created_at desc
    limit greatest(1, least(coalesce(p_limit, 20), 100))
    offset greatest(0, coalesce(p_offset, 0))
  )
  select
    f.id,
    f.nama,
    f.no_hp,
    f.angkatan,
    f.kecamatan_id,
    f.kecamatan_nama,
    f.desa_kelurahan_id,
    f.desa_kelurahan_nama,
    f.desa_kelurahan_jenis,
    f.is_aktif,
    f.has_account,
    (select count(*) from public.attendance_records ar where ar.alumni_id = f.id) as jumlah_absensi,
    f.total_count
  from filtered f
  order by lower(f.nama) asc nulls last, f.created_at desc;
end;
$$;

revoke execute on function public.admin_list_alumni(text, uuid, uuid, text, smallint, integer, integer) from public, anon;
grant execute on function public.admin_list_alumni(text, uuid, uuid, text, smallint, integer, integer) to authenticated;

-- Pilihan filter Angkatan: hanya tahun yang benar-benar ada di data.
create or replace function public.admin_alumni_angkatan_options()
returns table (angkatan smallint)
language plpgsql
stable
security invoker
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'Hanya Admin yang boleh melihat data alumni';
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

-- ============================================================
-- 5. Tambah / Edit alumni (tanpa email, tanpa status manual)
-- ============================================================
-- p_alumni_id NULL -> buat baru; terisi -> update. Nilai kosong (NULL)
-- benar-benar mengosongkan field (beda dengan admin_update_alumni lama yang
-- memakai coalesce). Kolom lama wilayah_id/alamat/status_keanggotaan
-- tidak disentuh.
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
    if v_alumni.profile_id is not null then
      update public.profiles
      set full_name = v_nama, phone = v_hp
      where id = v_alumni.profile_id;
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

-- ============================================================
-- 6. Hapus alumni
-- ============================================================
create or replace function public.admin_delete_alumni(p_alumni_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_nama text;
  v_absensi bigint;
begin
  if not public.is_admin() then
    raise exception 'Hanya Admin yang boleh menghapus data alumni';
  end if;

  select coalesce(nullif(btrim(p.full_name), ''), a.nama_lengkap)
    into v_nama
  from public.alumni a
  left join public.profiles p on p.id = a.profile_id
  where a.id = p_alumni_id;

  if not found then
    raise exception 'Data alumni tidak ditemukan';
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

revoke execute on function public.admin_delete_alumni(uuid) from public, anon, authenticated;
grant execute on function public.admin_delete_alumni(uuid) to authenticated;
