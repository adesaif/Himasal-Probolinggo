-- site_topics_select_public sebelumnya using(true) tanpa filter is_active,
-- beda dari pola semua tabel konten lain (yang selalu filter is_active/
-- status='published' untuk publik). Topik nonaktif seharusnya tidak
-- terlihat lewat query langsung ke tabel ini (nav/section publik sudah
-- filter is_active di kode, tapi RLS sendiri tidak menegakkannya). Admin/
-- Super Admin tetap melihat SEMUA baris (termasuk nonaktif) supaya UI
-- Topik & Navigasi tetap bisa menampilkan + mengaktifkan kembali topik
-- yang dinonaktifkan.
drop policy "site_topics_select_public" on public.site_topics;

create policy "site_topics_select_public"
  on public.site_topics for select
  to anon, authenticated
  using (is_active = true or public.is_admin() or public.is_super_admin());
