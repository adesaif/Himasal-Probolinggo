// Status akun login alumni (dihitung di database oleh
// admin_alumni_account_status dari auth.users). Dipakai daftar, detail, dan
// form Edit Alumni.
import type { Role } from "@/lib/constants";

export type AlumniAccountStatus =
  | "tanpa_akun"
  | "undangan_terkirim"
  | "menunggu_password"
  | "aktif";

export type AlumniAccountInfo = {
  status: AlumniAccountStatus;
  email: string | null;
  /** Role akun yang terhubung (null = belum punya akun = Alumni). */
  role: Role | null;
  /** Akun ber-role Admin/Super Admin - role diatur lewat kartu Role. */
  isStaff: boolean;
  invitedAt?: string | null;
  lastSignInAt?: string | null;
};

export const ACCOUNT_STATUS_LABEL: Record<AlumniAccountStatus, string> = {
  tanpa_akun: "Belum punya akun",
  undangan_terkirim: "Undangan terkirim",
  menunggu_password: "Menunggu pembuatan password",
  aktif: "Akun aktif",
};

export const ACCOUNT_STATUS_BADGE: Record<
  AlumniAccountStatus,
  "neutral" | "warning" | "success" | "primary"
> = {
  tanpa_akun: "neutral",
  undangan_terkirim: "warning",
  menunggu_password: "warning",
  aktif: "success",
};

export function toAccountStatus(value: string | null | undefined): AlumniAccountStatus {
  return value === "undangan_terkirim" || value === "menunggu_password" || value === "aktif"
    ? value
    : "tanpa_akun";
}

export function canResendInvitation(info: AlumniAccountInfo) {
  return !info.isStaff && (info.status === "undangan_terkirim" || info.status === "menunggu_password");
}

export const ROLE_BADGE: Record<Role, "neutral" | "primary" | "warning"> = {
  alumni: "neutral",
  admin: "primary",
  super_admin: "warning",
};
