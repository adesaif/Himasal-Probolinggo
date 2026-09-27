import "server-only";
import type { AuthError, SupabaseClient } from "@supabase/supabase-js";

import { createAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/types/database.types";

type SessionClient = SupabaseClient<Database>;

export type AccountOutcome =
  | { ok: true; kind: "invited" | "linked" | "resent" | "activation_sent"; message: string }
  | { ok: false; status: number; error: string; existingAlumniId?: string };

/**
 * Pastikan pemanggil adalah Admin. Otorisasi dibaca dari database
 * (is_admin() berdasarkan sesi login), bukan dari klaim client.
 */
export async function requireAdmin(supabase: SessionClient) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, status: 401, error: "Belum login" };

  const { data: isAdmin, error } = await supabase.rpc("is_admin");
  if (error || !isAdmin) {
    return { ok: false as const, status: 403, error: "Hanya Admin yang boleh mengelola akun alumni" };
  }
  return { ok: true as const };
}

/** Link di email undangan/aktivasi selalu kembali ke domain yang dipakai Admin. */
export function activationRedirectUrl(request: Request) {
  return `${new URL(request.url).origin}/auth/confirm`;
}

function serviceClient() {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY belum dikonfigurasi di server - akun alumni tidak dapat dibuat.",
    );
  }
  return createAdminClient();
}

function describeAuthError(error: AuthError): string {
  switch (error.code) {
    case "over_email_send_rate_limit":
      return "Batas pengiriman email Supabase tercapai. Coba lagi beberapa saat lagi, atau gunakan SMTP khusus di Supabase Auth.";
    case "email_address_not_authorized":
      return "Email undangan tidak dapat dikirim ke alamat ini: SMTP bawaan Supabase hanya mengirim ke anggota tim project. Atur SMTP khusus di Supabase Auth.";
    case "email_address_invalid":
      return "Alamat email ditolak oleh Supabase Auth. Periksa kembali ejaan email.";
    case "email_exists":
    case "user_already_exists":
      return "Email ini sudah terdaftar sebagai akun HIMASAL.";
    default:
      return error.message;
  }
}

/** Kirim ulang tautan aktivasi untuk akun yang belum membuat password. */
async function sendActivation(
  email: string,
  emailConfirmed: boolean,
  redirectTo: string,
): Promise<AccountOutcome> {
  const admin = serviceClient();

  if (!emailConfirmed) {
    // Supabase Auth memakai ulang user yang sama (email unik) - tidak ada
    // akun kedua yang dibuat.
    const { error } = await admin.auth.admin.inviteUserByEmail(email, { redirectTo });
    if (error) return { ok: false, status: 502, error: describeAuthError(error) };
    return { ok: true, kind: "resent", message: `Undangan dikirim ulang ke ${email}.` };
  }

  // Link undangan sudah pernah dibuka (email terverifikasi) tapi password
  // belum dibuat - undangan tidak bisa dipakai lagi, jadi kirim tautan
  // pembuatan password (recovery) ke email yang sama.
  const { error } = await admin.auth.resetPasswordForEmail(email, { redirectTo });
  if (error) return { ok: false, status: 502, error: describeAuthError(error) };
  return {
    ok: true,
    kind: "activation_sent",
    message: `Tautan pembuatan password dikirim ke ${email}.`,
  };
}

/**
 * Cek bentrok email SEBELUM data alumni dibuat, supaya form tidak
 * menyisakan data setengah jadi. Email milik Admin/Super Admin atau
 * alumni lain selalu ditolak.
 */
export async function checkEmailAvailable(
  supabase: SessionClient,
  email: string,
  alumniId?: string,
): Promise<AccountOutcome | null> {
  const { data, error } = await supabase.rpc("admin_find_account_by_email", { p_email: email });
  if (error) return { ok: false, status: 500, error: error.message };

  const existing = data?.[0];
  if (!existing) return null;

  if (existing.role !== "alumni") {
    return {
      ok: false,
      status: 409,
      error:
        "Email ini sudah digunakan akun Admin/Super Admin HIMASAL dan tidak dapat dipakai untuk akun Alumni.",
    };
  }
  if (existing.alumni_id && existing.alumni_id !== alumniId) {
    return {
      ok: false,
      status: 409,
      error: `Email ini sudah terdaftar untuk alumni ${existing.alumni_nama ?? "lain"}.`,
      existingAlumniId: existing.alumni_id,
    };
  }
  return null;
}

/**
 * Buat (atau hubungkan) akun login untuk satu baris alumni lalu kirim
 * undangan. Alur:
 *  - email belum ada di Auth  -> invite (Supabase membuat user + profil
 *    role 'alumni' lewat handle_new_user) -> hubungkan ke alumni
 *  - email sudah ada, role alumni, belum terhubung -> hubungkan akun yang
 *    sama (tanpa user kedua), kirim aktivasi kalau password belum dibuat
 *  - email milik Admin/Super Admin / alumni lain -> ditolak
 * Password TIDAK pernah dibuat/dikirim di sini - alumni membuatnya sendiri
 * lewat link undangan.
 */
export async function provisionAlumniAccount(
  supabase: SessionClient,
  params: { alumniId: string; email: string; fullName: string; redirectTo: string },
): Promise<AccountOutcome> {
  const { alumniId, email, fullName, redirectTo } = params;

  const conflict = await checkEmailAvailable(supabase, email, alumniId);
  if (conflict) return conflict;

  const { data: found } = await supabase.rpc("admin_find_account_by_email", { p_email: email });
  const existing = found?.[0];

  if (existing) {
    if (existing.alumni_id !== alumniId) {
      const { error: linkError } = await supabase.rpc("admin_link_alumni_account", {
        p_alumni_id: alumniId,
        p_user_id: existing.user_id,
      });
      if (linkError) return { ok: false, status: 409, error: linkError.message };
    }
    if (existing.password_set) {
      return {
        ok: true,
        kind: "linked",
        message: `Akun ${email} yang sudah aktif dihubungkan ke data alumni ini.`,
      };
    }
    const sent = await sendActivation(email, existing.email_confirmed, redirectTo);
    return sent.ok
      ? { ok: true, kind: "linked", message: `Akun ${email} dihubungkan. ${sent.message}` }
      : sent;
  }

  const admin = serviceClient();
  const { data: invited, error: inviteError } = await admin.auth.admin.inviteUserByEmail(email, {
    data: { full_name: fullName },
    redirectTo,
  });
  if (inviteError || !invited.user) {
    return {
      ok: false,
      status: 502,
      error: inviteError ? describeAuthError(inviteError) : "Gagal membuat akun alumni.",
    };
  }

  const { error: linkError } = await supabase.rpc("admin_link_alumni_account", {
    p_alumni_id: alumniId,
    p_user_id: invited.user.id,
  });
  if (linkError) {
    // Akun sudah dibuat & undangan terkirim; menyimpan ulang dengan email
    // yang sama akan menghubungkannya (tanpa membuat akun kedua).
    return {
      ok: false,
      status: 500,
      error: `Undangan terkirim, tetapi akun belum terhubung ke data alumni: ${linkError.message}`,
    };
  }

  return { ok: true, kind: "invited", message: `Undangan aktivasi dikirim ke ${email}.` };
}

/** Kirim ulang undangan untuk alumni yang akunnya belum aktif. */
export async function resendAlumniInvitation(
  supabase: SessionClient,
  alumniId: string,
  redirectTo: string,
): Promise<AccountOutcome> {
  const { data, error } = await supabase.rpc("admin_alumni_account_status", {
    p_alumni_ids: [alumniId],
  });
  if (error) return { ok: false, status: 500, error: error.message };

  const status = data?.[0];
  if (!status) return { ok: false, status: 404, error: "Data alumni tidak ditemukan" };
  if (status.account_status === "tanpa_akun" || !status.email) {
    return { ok: false, status: 409, error: "Alumni ini belum punya akun. Isi email lewat Edit." };
  }
  if (status.role !== "alumni") {
    return {
      ok: false,
      status: 409,
      error: "Akun ini milik Admin/Super Admin dan dikelola terpisah.",
    };
  }
  if (status.account_status === "aktif") {
    return { ok: false, status: 409, error: "Akun alumni ini sudah aktif." };
  }

  return sendActivation(status.email, status.email_confirmed_at !== null, redirectTo);
}
