import { z } from "zod";

export const profileFormSchema = z.object({
  full_name: z.string().trim().max(150).optional().or(z.literal("")),
  phone: z.string().trim().max(20).optional().or(z.literal("")),
  tempat_lahir: z.string().trim().max(100).optional().or(z.literal("")),
  tanggal_lahir: z.string().trim().optional().or(z.literal("")),
  alamat: z.string().trim().max(500).optional().or(z.literal("")),
  wilayah_id: z.string().trim().optional().or(z.literal("")),
});

export type ProfileFormInput = z.infer<typeof profileFormSchema>;
