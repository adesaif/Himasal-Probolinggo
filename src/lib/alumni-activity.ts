// Tampilan status keaktifan Alumni. RUMUS-nya TIDAK ada di sini - status,
// persentase, dan aturan 2 bulan dihitung di database (alumni_activity_stats,
// lihat migration 20260928194041_alumni_activity_status). File ini hanya
// label, warna, dan format supaya Dashboard Alumni, Admin, dan Super Admin
// menampilkan hasil yang sama dengan cara yang sama.

import type { SupabaseClient } from "@supabase/supabase-js";

import type { Role } from "@/lib/constants";
import type { Database } from "@/types/database.types";

export const ACTIVITY_STATUSES = [
  "aktif",
  "tidak_aktif",
  "tidak_aktif_sementara",
  "belum_ada_data",
] as const;

export type ActivityStatus = (typeof ACTIVITY_STATUSES)[number];

export function toActivityStatus(value: string | null | undefined): ActivityStatus {
  return ACTIVITY_STATUSES.includes(value as ActivityStatus)
    ? (value as ActivityStatus)
    : "belum_ada_data";
}

export const ACTIVITY_STATUS_LABEL: Record<ActivityStatus, string> = {
  aktif: "Aktif",
  tidak_aktif: "Tidak Aktif",
  tidak_aktif_sementara: "Tidak Aktif (Sementara)",
  belum_ada_data: "Belum ada data aktivitas",
};

/** Label dengan penanda tahun: "(Final)" untuk tahun yang sudah selesai. */
export function activityStatusLabel(status: ActivityStatus, isFinal = false) {
  if (isFinal && (status === "aktif" || status === "tidak_aktif")) {
    return `${ACTIVITY_STATUS_LABEL[status]} (Final)`;
  }
  return ACTIVITY_STATUS_LABEL[status];
}

export const ACTIVITY_STATUS_BADGE: Record<
  ActivityStatus,
  "success" | "destructive" | "warning" | "neutral"
> = {
  aktif: "success",
  tidak_aktif: "destructive",
  tidak_aktif_sementara: "warning",
  belum_ada_data: "neutral",
};

export const ACTIVITY_STATUS_COLOR: Record<ActivityStatus, { hex: string; className: string }> = {
  aktif: { hex: "#16a34a", className: "bg-green-600" },
  tidak_aktif: { hex: "#dc2626", className: "bg-red-600" },
  tidak_aktif_sementara: { hex: "#f59e0b", className: "bg-amber-500" },
  belum_ada_data: { hex: "#a3a3a3", className: "bg-neutral-400" },
};

export const ACTIVITY_STATUS_HINT: Record<ActivityStatus, string> = {
  aktif: "Kehadiran tahun ini minimal 50%.",
  tidak_aktif: "Kehadiran tahun ini di bawah 50%.",
  tidak_aktif_sementara:
    "Tidak hadir pada 2 bulan terakhir yang memiliki kegiatan. Hilang otomatis saat hadir lagi.",
  belum_ada_data: "Belum ada kegiatan terlaksana yang diperhitungkan tahun ini.",
};

/** Status kehadiran per kegiatan; null = kegiatan terlaksana tanpa catatan. */
export function attendanceLabel(status: string | null): string {
  switch (status) {
    case "HADIR":
      return "Hadir";
    case "TIDAK_HADIR":
      return "Tidak Hadir";
    case "IZIN":
      return "Izin";
    case "SAKIT":
      return "Sakit";
    default:
      return "Tidak Tercatat";
  }
}

export function formatPercent(value: number | null | undefined): string {
  if (value === null || value === undefined) return "-";
  return `${new Intl.NumberFormat("id-ID", { maximumFractionDigits: 1 }).format(value)}%`;
}

export const EVENT_STATUS_LABEL: Record<string, string> = {
  selesai: "Terlaksana",
  berlangsung: "Berlangsung",
  akan_datang: "Akan Datang",
};

// ---------------------------------------------------------------------------
// Bentuk data RPC alumni_activity_detail (JSON) - satu tipe untuk tiga
// halaman detail.
// ---------------------------------------------------------------------------

export type ActivitySummary = {
  tahun: number;
  is_final: boolean;
  kegiatan: number;
  hadir: number;
  tidak_hadir: number;
  izin: number;
  sakit: number;
  tidak_tercatat: number;
  persentase: number | null;
  terakhir_hadir: string | null;
  sementara: boolean;
  status: ActivityStatus;
};

export type ActivityHistoryItem = {
  event_id: string;
  judul: string;
  mulai: string;
  selesai: string | null;
  lokasi: string | null;
  wajib: boolean;
  tahun: number;
  status: string | null;
  waktu_scan: string | null;
  /** false = kegiatan sebelum tanggal terdaftar: histori saja, tidak dihitung. */
  dihitung: boolean;
};

export type ActivityTrendPoint = {
  bulan: number;
  kegiatan: number;
  hadir: number;
  akan_datang: boolean;
};

export type AlumniActivityDetail = {
  tahun: number;
  tahun_berjalan: number;
  data_sensitif_disembunyikan: boolean;
  profil: {
    id: string;
    nama: string | null;
    alamat: string | null;
    kecamatan: string | null;
    desa_kelurahan: string | null;
    desa_kelurahan_jenis: string | null;
    no_hp: string | null;
    tempat_lahir: string | null;
    tanggal_lahir: string | null;
    angkatan: number | null;
    terdaftar: string;
    status_akun: string;
    role: Role | null;
  };
  ringkasan: ActivitySummary;
  tahun_tersedia: number[];
  tren: ActivityTrendPoint[];
  riwayat: ActivityHistoryItem[];
};

export function parseActivityDetail(json: unknown): AlumniActivityDetail {
  const detail = json as AlumniActivityDetail;
  return {
    ...detail,
    ringkasan: { ...detail.ringkasan, status: toActivityStatus(detail.ringkasan?.status) },
  };
}

/**
 * Ambil master detail satu Alumni (tanpa id = Alumni yang sedang login).
 * Hak akses & penyembunyian data sensitif ditegakkan di RPC.
 */
export async function fetchAlumniActivityDetail(
  supabase: SupabaseClient<Database>,
  params: { alumniId?: string; year?: number },
) {
  const { data, error } = await supabase.rpc("alumni_activity_detail", {
    p_alumni_id: params.alumniId,
    p_year: params.year,
  });
  return { detail: data ? parseActivityDetail(data) : null, error };
}

/** Parameter ?tahun= yang valid (4 digit), selain itu undefined. */
export function parseYearParam(value: string | undefined): number | undefined {
  if (!value || !/^\d{4}$/.test(value)) return undefined;
  return Number(value);
}

export const MONTH_SHORT = [
  "Jan", "Feb", "Mar", "Apr", "Mei", "Jun",
  "Jul", "Agu", "Sep", "Okt", "Nov", "Des",
];
