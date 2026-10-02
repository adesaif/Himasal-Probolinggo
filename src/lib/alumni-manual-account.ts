/**
 * Inti alur "Buat Akun Manual" untuk Alumni (tanpa email undangan/SMTP).
 * Sengaja tanpa dependensi Supabase/server supaya urutan langkah & rollback
 * bisa diuji dengan mock; pemanggil (src/lib/alumni-account.ts) yang
 * menyuntikkan klien sesi Admin + klien service-role.
 *
 * Urutan:
 *  1. Record Alumni harus ada dan BELUM punya akun.
 *  2. Email belum dipakai akun mana pun.
 *  3. Buat user Supabase Auth (email_confirm = true) - trigger
 *     handle_new_user membuat profil dengan role bawaan 'alumni'.
 *  4. Hubungkan ke record Alumni lewat RPC admin_link_alumni_account
 *     (sesi Admin, semua aturan RPC tetap berlaku).
 *  5. Jika langkah 4 gagal, user yang baru dibuat dihapus lagi.
 * Password hanya diteruskan ke createUser - tidak pernah dikembalikan,
 * di-log, atau disimpan di tempat lain.
 */

export type ManualAccountDeps = {
  findAlumni: (
    alumniId: string,
  ) => Promise<{ id: string; profile_id: string | null; nama_lengkap: string | null } | null>;
  emailInUse: (email: string) => Promise<boolean>;
  createUser: (input: {
    email: string;
    password: string;
    fullName: string;
  }) => Promise<{ userId: string } | { error: string; status: number }>;
  linkAccount: (alumniId: string, userId: string) => Promise<{ error: string | null }>;
  deleteUser: (userId: string) => Promise<{ error: string | null }>;
  /** Hanya id - tanpa email/password. */
  logOrphan?: (info: { alumniId: string; userId: string }) => void;
};

export type ManualAccountOutcome =
  | { ok: true; message: string }
  | { ok: false; status: number; error: string };

export async function createManualAlumniAccount(
  deps: ManualAccountDeps,
  params: { alumniId: string; email: string; password: string },
): Promise<ManualAccountOutcome> {
  const { alumniId, email, password } = params;

  const alumni = await deps.findAlumni(alumniId);
  if (!alumni) return { ok: false, status: 404, error: "Data alumni tidak ditemukan." };
  if (alumni.profile_id) {
    return { ok: false, status: 409, error: "Alumni ini sudah punya akun login." };
  }

  if (await deps.emailInUse(email)) {
    return { ok: false, status: 409, error: "Email ini sudah terdaftar sebagai akun HIMASAL." };
  }

  const created = await deps.createUser({ email, password, fullName: alumni.nama_lengkap ?? "" });
  if ("error" in created) return { ok: false, status: created.status, error: created.error };

  const { error: linkError } = await deps.linkAccount(alumniId, created.userId);
  if (linkError) {
    const { error: deleteError } = await deps.deleteUser(created.userId);
    if (deleteError) {
      deps.logOrphan?.({ alumniId, userId: created.userId });
      return {
        ok: false,
        status: 500,
        error: `Akun gagal dihubungkan ke data alumni (${linkError}) dan pembersihan otomatis gagal. Akun login ${email} perlu dihapus dari Supabase Auth sebelum mencoba lagi.`,
      };
    }
    return { ok: false, status: 409, error: `Akun tidak dibuat: ${linkError}` };
  }

  return {
    ok: true,
    message: `Akun ${email} dibuat dan aktif. Alumni dapat login di /login dengan password awal, lalu menggantinya di Profil → Keamanan Akun.`,
  };
}
