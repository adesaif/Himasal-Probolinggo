import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database.types";

const ORG_ASSETS_BUCKET = "organization-assets";

function extractStoragePath(url: string): string | null {
  const marker = `/storage/v1/object/public/${ORG_ASSETS_BUCKET}/`;
  const idx = url.indexOf(marker);
  if (idx === -1) return null;
  return url.slice(idx + marker.length);
}

/**
 * Hapus file di Supabase Storage HANYA jika tidak dipakai record lain
 * (dicek lewat `isStillReferenced`, dipanggil SETELAH row CMS-nya sendiri
 * berhasil dihapus permanen). Ini mencegah file yatim menumpuk di Storage
 * tanpa pernah menghapus asset yang masih dipakai record lain (shared
 * asset) - jika path tidak dikenali (bukan dari bucket ini) atau file
 * masih dipakai, fungsi ini tidak melakukan apa-apa.
 */
export async function cleanupStorageFileIfUnused(
  supabase: SupabaseClient<Database>,
  url: string | null | undefined,
  isStillReferenced: () => Promise<boolean>,
): Promise<void> {
  if (!url) return;
  const path = extractStoragePath(url);
  if (!path) return;

  const stillReferenced = await isStillReferenced();
  if (stillReferenced) return;

  await supabase.storage.from(ORG_ASSETS_BUCKET).remove([path]);
}
