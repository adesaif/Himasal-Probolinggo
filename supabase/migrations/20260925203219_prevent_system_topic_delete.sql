-- Cegah penghapusan topik sistem di level DATABASE, bukan cuma UI. Bug nyata
-- ditemukan saat audit menyeluruh: 4 topik sistem (galeri/profil/masayikh/
-- konten) hilang lagi dari site_topics production di luar migrasi manapun -
-- hanya tombol hapus di UI yang disembunyikan untuk topik sistem
-- (topic-list.tsx: {!topic.is_system ? ... }), sementara RLS DELETE
-- (site_topics_delete_admin) tidak pernah mengecualikan is_system=true.
-- Trigger ini menutup celah itu di level DB supaya baris sistem benar-benar
-- tidak bisa dihapus siapa pun, lewat jalur mana pun.
create function public.prevent_system_topic_delete()
returns trigger
language plpgsql
as $$
begin
  if old.is_system then
    raise exception 'Topik sistem (%) tidak boleh dihapus.', old.key;
  end if;
  return old;
end;
$$;

create trigger site_topics_prevent_system_delete
  before delete on public.site_topics
  for each row
  execute function public.prevent_system_topic_delete();
