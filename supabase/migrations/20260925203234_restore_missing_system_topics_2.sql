-- Restore topik sistem yang kembali hilang dari site_topics production
-- (galeri/profil/masayikh/konten) - ditemukan saat audit menyeluruh. Migrasi
-- restore sebelumnya (20260924100000_news_topic_id_and_restore_system_topics)
-- sudah pernah mengembalikan berita/galeri/masayikh/konten, tapi tanpa guard
-- DB (lihat migrasi prevent_system_topic_delete), sebagian topik sistem
-- terhapus LAGI setelah itu. Nilai di bawah disalin apa adanya dari seed
-- asli (20260920140000_site_topics.sql) - is_system=true karena keempatnya
-- termasuk 7 topik yang di-seed sejak awal, bukan topik custom buatan Admin.
-- ON CONFLICT (key) DO NOTHING supaya aman dijalankan ulang dan no-op untuk
-- baris yang ternyata masih ada.
insert into public.site_topics
  (key, label, display_order, allow_featured, supports_featured, is_system,
   default_label, default_display_order, default_allow_featured)
values
  ('galeri',   'Galeri',   3, false, false, true, 'Galeri',   3, false),
  ('profil',   'Profil',   4, false, false, true, 'Profil',   4, false),
  ('masayikh', 'Masayikh', 6, false, false, true, 'Masayikh', 6, false),
  ('konten',   'Konten',   7, false, false, true, 'Konten',   7, false)
on conflict (key) do nothing;
