export const ATTENDANCE_STATUS_LABEL: Record<string, string> = {
  HADIR: "Hadir",
  TIDAK_HADIR: "Tidak Hadir",
  IZIN: "Izin",
  SAKIT: "Sakit",
};

export const ATTENDANCE_STATUS_BADGE_CLASS: Record<string, string> = {
  HADIR:
    "rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800 dark:bg-green-900/40 dark:text-green-300",
  TIDAK_HADIR:
    "rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-800 dark:bg-red-900/40 dark:text-red-300",
  IZIN: "rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",
  SAKIT:
    "rounded-full bg-purple-100 px-2.5 py-0.5 text-xs font-medium text-purple-800 dark:bg-purple-900/40 dark:text-purple-300",
};

export const BELUM_ABSEN_BADGE_CLASS =
  "rounded-full bg-neutral-100 px-2.5 py-0.5 text-xs font-medium text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300";

export const BELUM_ABSEN_LABEL = "Belum Absen";

/**
 * Warna dipakai konsisten antara legend chart (Tailwind class) dan
 * conic-gradient donut (butuh nilai hex literal - tidak bisa pakai class
 * Tailwind di dalam inline style).
 */
export const ATTENDANCE_STATUS_CHART_COLOR: Record<
  string,
  { hex: string; className: string }
> = {
  HADIR: { hex: "#16a34a", className: "bg-green-600" },
  TIDAK_HADIR: { hex: "#dc2626", className: "bg-red-600" },
  IZIN: { hex: "#2563eb", className: "bg-blue-600" },
  SAKIT: { hex: "#9333ea", className: "bg-purple-600" },
  BELUM_ABSEN: { hex: "#a3a3a3", className: "bg-neutral-400" },
};

/**
 * QR absensi berisi link ke halaman scan + token acak di query string -
 * bisa dipindai kamera bawaan HP (bukan hanya scanner in-app). Token TIDAK
 * pernah berisi ID alumni atau data sensitif lain.
 */
export function buildAttendanceScanUrl(token: string): string {
  const base = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  return `${base}/dashboard/absensi/scan?token=${encodeURIComponent(token)}`;
}

export function extractAttendanceToken(scanned: string): string | null {
  const trimmed = scanned.trim();
  if (!trimmed) return null;

  try {
    const url = new URL(trimmed);
    const token = url.searchParams.get("token");
    if (token) return token;
  } catch {
    // Bukan URL - anggap input adalah token mentah (fallback input manual).
  }

  return trimmed;
}
