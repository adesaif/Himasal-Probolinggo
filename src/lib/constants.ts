export const WILAYAH_DEFAULT = [
  "Probolinggo Barat",
  "Probolinggo Tengah",
  "Probolinggo Timur",
] as const;

export const ROLES = ["alumni", "admin", "super_admin"] as const;
export type Role = (typeof ROLES)[number];

export const STATUS_KEANGGOTAAN = ["aktif", "nonaktif"] as const;

export const STATUS_ABSENSI = [
  "HADIR",
  "TIDAK_HADIR",
  "IZIN",
  "SAKIT",
] as const;

export const ROLE_HOME_ROUTE: Record<Role, string> = {
  alumni: "/dashboard",
  admin: "/admin",
  super_admin: "/monitoring",
};
