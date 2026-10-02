import { z } from "zod";

import { isValidEmailFormat } from "@/lib/email-suggest";

const EMAIL_INVALID = "Format email tidak valid (contoh: nama@gmail.com)";

// Form Tambah/Edit Alumni (Admin). Tidak ada wilayah atau status: alamat
// memakai Kecamatan -> Desa/Kelurahan, dan status Aktif/Nonaktif dihitung
// otomatis dari absensi. Email = identitas akun login alumni (disimpan di
// Supabase Auth, bukan di tabel alumni) - wajib saat Tambah, opsional saat
// Edit alumni lama yang belum punya akun.
function buildAlumniFormSchema({ emailRequired }: { emailRequired: boolean }) {
  return z
    .object({
      full_name: z.string().trim().min(1, "Nama lengkap wajib diisi").max(150),
      email: z
        .string()
        .trim()
        .refine((v) => (v === "" ? !emailRequired : isValidEmailFormat(v)), {
          message: EMAIL_INVALID,
        })
        .refine((v) => !(emailRequired && v === ""), { message: "Email wajib diisi" }),
      kecamatan_id: z.string().nullable(),
      desa_kelurahan_id: z.string().nullable(),
      phone: z
        .string()
        .trim()
        .max(20, "Nomor HP maksimal 20 karakter")
        .regex(/^[0-9+()\-\s]*$/, "Nomor HP hanya boleh berisi angka, spasi, +, -, ( )"),
      tempat_lahir: z.string().trim().max(100),
      tanggal_lahir: z.string().trim(),
      angkatan: z.number().int().nullable(),
    })
    .refine((v) => !v.desa_kelurahan_id || v.kecamatan_id, {
      message: "Pilih kecamatan terlebih dahulu",
      path: ["desa_kelurahan_id"],
    })
    .refine(
      (v) => v.angkatan === null || (v.angkatan >= 1800 && v.angkatan <= new Date().getFullYear()),
      { message: "Angkatan harus antara 1800 dan tahun berjalan", path: ["angkatan"] },
    );
}

export const alumniCreateSchema = buildAlumniFormSchema({ emailRequired: true });
export const alumniEditSchema = buildAlumniFormSchema({ emailRequired: false });

export type AlumniFormValues = z.infer<typeof alumniEditSchema>;

export const EMPTY_ALUMNI_FORM: AlumniFormValues = {
  full_name: "",
  email: "",
  kecamatan_id: null,
  desa_kelurahan_id: null,
  phone: "",
  tempat_lahir: "",
  tanggal_lahir: "",
  angkatan: null,
};

// Body yang diterima route server (divalidasi ulang di server karena route
// itu yang memegang service-role key).
export const alumniCreateBodySchema = z.object({
  full_name: z.string().trim().min(1).max(150),
  email: z.string().trim().refine(isValidEmailFormat, { message: EMAIL_INVALID }),
  kecamatan_id: z.string().uuid().nullable(),
  desa_kelurahan_id: z.string().uuid().nullable(),
  phone: z.string().trim().max(20),
  tempat_lahir: z.string().trim().max(100),
  tanggal_lahir: z.string().trim(),
  angkatan: z.number().int().min(1800).nullable(),
});

export const alumniAccountBodySchema = z.object({
  email: z.string().trim().refine(isValidEmailFormat, { message: EMAIL_INVALID }).optional(),
});

// Password akun staf yang dibuat manual oleh Admin (Supabase Auth yang
// menyimpan hash-nya - tidak pernah disimpan di tabel aplikasi).
export const staffPasswordSchema = z
  .string()
  .min(8, "Password minimal 8 karakter")
  .max(72, "Password maksimal 72 karakter")
  .regex(/[A-Za-z]/, "Password harus mengandung huruf")
  .regex(/[0-9]/, "Password harus mengandung angka");

// Form "Jadikan Admin/Super Admin" untuk Alumni yang BELUM punya akun.
export const staffAccountFormSchema = z
  .object({
    email: z
      .string()
      .trim()
      .min(1, "Email wajib diisi")
      .refine(isValidEmailFormat, { message: EMAIL_INVALID }),
    password: staffPasswordSchema,
    confirm: z.string(),
  })
  .refine((v) => v.password === v.confirm, {
    message: "Konfirmasi password tidak sama",
    path: ["confirm"],
  });

export type StaffAccountFormValues = z.infer<typeof staffAccountFormSchema>;

// Body POST /api/admin/alumni/:id/role. email+password hanya dipakai kalau
// Alumni belum punya akun (diabaikan kalau sudah - tidak ada akun kedua).
export const alumniRoleBodySchema = z
  .object({
    role: z.enum(["alumni", "admin", "super_admin"]),
    email: z.string().trim().refine(isValidEmailFormat, { message: EMAIL_INVALID }).optional(),
    password: staffPasswordSchema.optional(),
  })
  .refine((v) => (v.email === undefined) === (v.password === undefined), {
    message: "Email dan password harus diisi bersamaan",
  });

// Body POST /api/admin/alumni/:id/account/manual - Buat Akun Manual untuk
// Alumni yang belum punya akun (tanpa undangan). Kebijakan password sama
// dengan akun staf & aktivasi.
export const alumniManualAccountBodySchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "Email wajib diisi")
    .refine(isValidEmailFormat, { message: EMAIL_INVALID }),
  password: staffPasswordSchema,
});
