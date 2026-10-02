import "server-only";
import type { AuthError, SupabaseClient } from "@supabase/supabase-js";

import { createAdminClient, getServiceRoleKey } from "@/lib/supabase/admin";
import {
  createManualAlumniAccount,
  type ManualAccountOutcome,
} from "@/lib/alumni-manual-account";
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
  if (!getServiceRoleKey()) {
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

export type RoleOutcome =
  | { ok: true; message: string; accountCreated: boolean }
  | { ok: false; status: number; error: string };

const ROLE_NAME: Record<"alumni" | "admin" | "super_admin", string> = {
  alumni: "Alumni",
  admin: "Admin",
  super_admin: "Super Admin",
};

/**
 * Ubah role Alumni (Admin -> Alumni). Aturan role ditegakkan di database
 * (admin_set_alumni_role/admin_set_role: hanya Admin, target wajib punya
 * record Alumni, bukan akun sendiri, Admin Pusat tidak tersentuh, audit
 * log). Di sini hanya urusan akun:
 *  - Alumni SUDAH punya akun -> ubah role akun yang sama (email & password
 *    tetap, tidak ada akun kedua; email/password yang dikirim diabaikan).
 *  - Alumni BELUM punya akun & diangkat jadi Admin/Super Admin -> akun
 *    dibuat manual di Supabase Auth (email + password dari Admin, langsung
 *    terverifikasi - TANPA email undangan/SMTP), dihubungkan ke record
 *    Alumni ini, lalu role-nya diubah. Kalau salah satu langkah gagal, akun
 *    yang baru dibuat dihapus lagi supaya tidak ada akun yatim.
 * Password hanya diteruskan ke Supabase Auth (yang menyimpan hash-nya) -
 * tidak pernah disimpan di tabel aplikasi maupun di-log.
 */
export async function changeAlumniRole(
  supabase: SessionClient,
  params: {
    alumniId: string;
    role: "alumni" | "admin" | "super_admin";
    email?: string;
    password?: string;
  },
): Promise<RoleOutcome> {
  const { alumniId, role, email, password } = params;

  const { data: alumni, error: alumniError } = await supabase
    .from("alumni")
    .select("id, profile_id, nama_lengkap")
    .eq("id", alumniId)
    .maybeSingle();
  if (alumniError) return { ok: false, status: 500, error: alumniError.message };
  if (!alumni) return { ok: false, status: 404, error: "Data alumni tidak ditemukan" };

  if (alumni.profile_id) {
    const { error } = await supabase.rpc("admin_set_alumni_role", {
      p_alumni_id: alumniId,
      p_new_role: role,
    });
    if (error) return { ok: false, status: 409, error: error.message };
    return {
      ok: true,
      accountCreated: false,
      message: `Role diubah menjadi ${ROLE_NAME[role]}. Email & password akun tetap.`,
    };
  }

  if (role === "alumni") {
    return { ok: false, status: 409, error: "Alumni ini belum punya akun login." };
  }
  if (!email || !password) {
    return {
      ok: false,
      status: 400,
      error: "Alumni ini belum punya akun. Isi email dan password untuk membuat akun.",
    };
  }

  // Email tidak boleh dipakai akun mana pun (Alumni lain, Admin, Super Admin).
  const { data: found, error: findError } = await supabase.rpc("admin_find_account_by_email", {
    p_email: email,
  });
  if (findError) return { ok: false, status: 500, error: findError.message };
  if (found?.[0]) {
    return { ok: false, status: 409, error: "Email ini sudah terdaftar sebagai akun HIMASAL." };
  }

  const admin = serviceClient();
  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: alumni.nama_lengkap ?? "" },
  });
  if (createError || !created.user) {
    const message = createError
      ? createError.code === "weak_password"
        ? "Password ditolak Supabase Auth karena terlalu lemah. Gunakan password lain."
        : describeAuthError(createError)
      : "Gagal membuat akun.";
    return { ok: false, status: createError?.status === 422 ? 409 : 502, error: message };
  }

  const userId = created.user.id;
  const rollback = async (reason: string): Promise<RoleOutcome> => {
    await admin.auth.admin.deleteUser(userId);
    return { ok: false, status: 409, error: reason };
  };

  const { error: linkError } = await supabase.rpc("admin_link_alumni_account", {
    p_alumni_id: alumniId,
    p_user_id: userId,
  });
  if (linkError) return rollback(linkError.message);

  const { error: roleError } = await supabase.rpc("admin_set_alumni_role", {
    p_alumni_id: alumniId,
    p_new_role: role,
  });
  if (roleError) return rollback(roleError.message);

  return {
    ok: true,
    accountCreated: true,
    message: `Akun ${email} dibuat dan diangkat menjadi ${ROLE_NAME[role]}. Akun langsung dapat login.`,
  };
}

/**
 * "Buat Akun Manual" untuk Alumni yang belum punya akun: email + password
 * awal dari Admin, akun langsung aktif (email_confirm, TANPA undangan),
 * role 'alumni' dari trigger handle_new_user, lalu dihubungkan ke record
 * Alumni. Alur & rollback ada di createManualAlumniAccount. Service-role
 * hanya dipakai untuk createUser/deleteUser; pemeriksaan & penautan memakai
 * sesi Admin sehingga is_admin() dan aturan RPC tetap berlaku.
 */
export async function createAlumniAccountManual(
  supabase: SessionClient,
  params: { alumniId: string; email: string; password: string },
): Promise<ManualAccountOutcome> {
  const admin = serviceClient();

  return createManualAlumniAccount(
    {
      async findAlumni(alumniId) {
        const { data, error } = await supabase
          .from("alumni")
          .select("id, profile_id, nama_lengkap")
          .eq("id", alumniId)
          .maybeSingle();
        if (error) throw new Error(error.message);
        return data;
      },
      async emailInUse(email) {
        const { data, error } = await supabase.rpc("admin_find_account_by_email", {
          p_email: email,
        });
        if (error) throw new Error(error.message);
        return Boolean(data?.[0]);
      },
      async createUser({ email, password, fullName }) {
        const { data, error } = await admin.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
          user_metadata: { full_name: fullName },
        });
        if (error || !data.user) {
          return {
            status: error?.status === 422 ? 409 : 502,
            error: error
              ? error.code === "weak_password"
                ? "Password ditolak Supabase Auth karena terlalu lemah. Gunakan password lain."
                : describeAuthError(error)
              : "Gagal membuat akun.",
          };
        }
        return { userId: data.user.id };
      },
      async linkAccount(alumniId, userId) {
        const { error } = await supabase.rpc("admin_link_alumni_account", {
          p_alumni_id: alumniId,
          p_user_id: userId,
        });
        return { error: error?.message ?? null };
      },
      async deleteUser(userId) {
        const { error } = await admin.auth.admin.deleteUser(userId);
        return { error: error?.message ?? null };
      },
      logOrphan({ alumniId, userId }) {
        console.error("[alumni-manual-account] rollback gagal, akun yatim", { alumniId, userId });
      },
    },
    params,
  );
}
