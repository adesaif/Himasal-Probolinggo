import { z } from "zod";

export const createAlumniSchema = z.object({
  full_name: z.string().trim().min(1, "Nama wajib diisi").max(150),
  email: z.string().trim().min(1, "Email wajib diisi").email("Format email tidak valid"),
  phone: z.string().trim().max(20).optional().or(z.literal("")),
  tempat_lahir: z.string().trim().max(100).optional().or(z.literal("")),
  tanggal_lahir: z.string().trim().optional().or(z.literal("")),
  alamat: z.string().trim().max(500).optional().or(z.literal("")),
  wilayah_id: z.string().trim().optional().or(z.literal("")),
  angkatan: z.string().trim().optional().or(z.literal("")),
});

export type CreateAlumniInput = z.infer<typeof createAlumniSchema>;

export const updateAlumniSchema = createAlumniSchema.omit({ email: true });

export type UpdateAlumniInput = z.infer<typeof updateAlumniSchema>;
