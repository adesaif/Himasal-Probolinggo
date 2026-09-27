import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database.types";

export type DesaKelurahan = {
  id: string;
  nama: string;
  jenis: "desa" | "kelurahan";
};

export type Kecamatan = {
  id: string;
  nama: string;
  desaKelurahan: DesaKelurahan[];
};

/**
 * Master Kecamatan -> Desa/Kelurahan untuk modul Admin -> Alumni. Satu-
 * satunya sumber daftar lokasi (tabel `kecamatan` + `desa_kelurahan`, lihat
 * migration 20260927100000) - dipakai bersama oleh filter daftar alumni,
 * form Tambah, dan form Edit, jadi tidak pernah ada dua daftar berbeda.
 * Kecamatan urut abjad; desa/kelurahan mengikuti `urutan` daftar resmi.
 */
export async function fetchLokasiAlumni(
  supabase: SupabaseClient<Database>,
): Promise<Kecamatan[]> {
  const [{ data: kecamatan }, { data: desa }] = await Promise.all([
    supabase.from("kecamatan").select("id, nama").order("nama"),
    supabase
      .from("desa_kelurahan")
      .select("id, nama, jenis, kecamatan_id, urutan")
      .order("urutan"),
  ]);

  const byKecamatan = new Map<string, DesaKelurahan[]>();
  for (const d of desa ?? []) {
    const list = byKecamatan.get(d.kecamatan_id) ?? [];
    list.push({ id: d.id, nama: d.nama, jenis: d.jenis === "kelurahan" ? "kelurahan" : "desa" });
    byKecamatan.set(d.kecamatan_id, list);
  }

  return (kecamatan ?? []).map((k) => ({
    id: k.id,
    nama: k.nama,
    desaKelurahan: byKecamatan.get(k.id) ?? [],
  }));
}

export function desaKelurahanLabel(jenis: string | null | undefined): string {
  return jenis === "kelurahan" ? "Kel." : "Desa";
}
