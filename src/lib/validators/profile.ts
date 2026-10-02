import { z } from "zod";

import { staffPasswordSchema } from "@/lib/validators/alumni";

// Form Profil Saya (Alumni). Menulis ke master alumni lewat
// alumni_save_own_profile - aturan yang sama divalidasi ulang di database.
// Lokasi memakai Kecamatan -> Desa/Kelurahan (bukan Wilayah lama).
export const profileFormSchema = z
  .object({
    full_name: z.string().trim().min(1, "Nama lengkap wajib diisi").max(150),
    phone: z
      .string()
      .trim()
      .max(20, "Nomor HP maksimal 20 karakter")
      .regex(/^[0-9+()\-\s]*$/, "Nomor HP hanya boleh berisi angka, spasi, +, -, ( )"),
    tempat_lahir: z.string().trim().max(100, "Tempat lahir maksimal 100 karakter"),
    tanggal_lahir: z.string().trim(),
    alamat: z.string().trim().max(500, "Alamat maksimal 500 karakter"),
    kecamatan_id: z.string().nullable(),
    desa_kelurahan_id: z.string().nullable(),
  })
  .refine((v) => !v.desa_kelurahan_id || v.kecamatan_id, {
    message: "Pilih kecamatan terlebih dahulu",
    path: ["desa_kelurahan_id"],
  });

export type ProfileFormInput = z.infer<typeof profileFormSchema>;

// Form Ganti Password (Profil -> Keamanan Akun). Kebijakan password sama
// dengan aktivasi akun & akun staf: minimal 8, maksimal 72, huruf + angka.
// Password lama divalidasi oleh Supabase Auth (current_password).
export const changePasswordSchema = z
  .object({
    current_password: z.string().min(1, "Password lama wajib diisi"),
    new_password: staffPasswordSchema,
    confirm: z.string().min(1, "Konfirmasi password wajib diisi"),
  })
  .refine((v) => v.new_password === v.confirm, {
    message: "Konfirmasi password tidak sama",
    path: ["confirm"],
  })
  .refine((v) => v.new_password !== v.current_password, {
    message: "Password baru harus berbeda dari password lama",
    path: ["new_password"],
  });

export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
