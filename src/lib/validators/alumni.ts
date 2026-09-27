import { z } from "zod";

// Form Tambah/Edit Alumni (Admin). Sengaja TIDAK ada email, wilayah, atau
// status: alumni dibuat tanpa akun login, alamat memakai Kecamatan ->
// Desa/Kelurahan, dan status Aktif/Nonaktif dihitung otomatis dari absensi.
export const alumniFormSchema = z
  .object({
    full_name: z.string().trim().min(1, "Nama lengkap wajib diisi").max(150),
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

export type AlumniFormValues = z.infer<typeof alumniFormSchema>;

export const EMPTY_ALUMNI_FORM: AlumniFormValues = {
  full_name: "",
  kecamatan_id: null,
  desa_kelurahan_id: null,
  phone: "",
  tempat_lahir: "",
  tanggal_lahir: "",
  angkatan: null,
};
