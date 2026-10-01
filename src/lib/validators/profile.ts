import { z } from "zod";

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
