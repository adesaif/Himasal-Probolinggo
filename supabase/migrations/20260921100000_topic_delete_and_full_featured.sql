-- Koreksi requirement Topic Management:
-- 1. Admin harus bisa BENAR-BENAR menghapus topik dari site_topics (bukan
--    hanya reset ke default) - tambah policy DELETE untuk admin. Ini aman
--    tanpa cascade/orphan risk apa pun karena site_topics TIDAK direferensi
--    oleh FK dari table konten mana pun (news/events/dll tidak punya
--    kolom yang menunjuk ke site_topics.id) - baris topik hanyalah
--    label/flag yang dibaca via `key` di kode, bukan relasi database.
--    Menghapus baris topik tidak pernah menyentuh/menghapus konten.
create policy "site_topics_delete_admin"
  on public.site_topics for delete
  to authenticated
  using (public.is_admin());

-- 2. Supaya "Unggulan ON/OFF" per topik benar-benar berfungsi (bukan UI
--    palsu) untuk SEMUA topik yang punya model konten nyata, tambahkan
--    is_featured minimum ke masing-masing table konten yang belum
--    memilikinya. Additive, tidak ada drop/rename kolom existing.
alter table public.gallery_items
  add column is_featured boolean not null default false;

alter table public.organization_structure
  add column is_featured boolean not null default false;

alter table public.masayikh
  add column is_featured boolean not null default false;

-- organization_profile adalah singleton (1 baris) tanpa field foto -
-- tambahkan is_featured + image_url supaya "Profil Featured" bisa jadi
-- slide Hero yang nyata (foto + judul + link ke /profil), sama seperti
-- Berita/Agenda.
alter table public.organization_profile
  add column is_featured boolean not null default false,
  add column image_url text;

-- Tandai 5 topik ini sekarang benar-benar mendukung Featured di level
-- konten (dipakai untuk catatan UI, BUKAN untuk menyembunyikan toggle -
-- toggle Unggulan tetap tampil nyata untuk ke-7 topik termasuk Konten).
update public.site_topics
set supports_featured = true
where key in ('galeri', 'profil', 'struktur', 'masayikh');
