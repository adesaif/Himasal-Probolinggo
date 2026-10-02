-- Perbaikan langsung dari advisor security setelah migrasi sebelumnya:
-- search_path fungsi trigger baru harus dikunci (best practice Postgres/
-- Supabase) supaya tidak bisa dipengaruhi search_path role pemanggil.
alter function public.prevent_system_topic_delete() set search_path = '';
