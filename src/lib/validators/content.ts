import { z } from "zod";

export const organizationProfileSchema = z.object({
  sejarah: z.string().trim().max(5000).optional().or(z.literal("")),
  visi: z.string().trim().max(2000).optional().or(z.literal("")),
  misi: z.string().trim().max(2000).optional().or(z.literal("")),
  tujuan: z.string().trim().max(2000).optional().or(z.literal("")),
  deskripsi: z.string().trim().max(2000).optional().or(z.literal("")),
});
export type OrganizationProfileInput = z.infer<typeof organizationProfileSchema>;

export const structureSchema = z.object({
  nama: z.string().trim().min(1, "Nama wajib diisi").max(150),
  jabatan: z.string().trim().min(1, "Jabatan wajib diisi").max(150),
  display_order: z.string().trim().optional().or(z.literal("")),
});
export type StructureInput = z.infer<typeof structureSchema>;

export const masayikhSchema = z.object({
  nama: z.string().trim().min(1, "Nama wajib diisi").max(150),
  deskripsi: z.string().trim().max(1000).optional().or(z.literal("")),
  display_order: z.string().trim().optional().or(z.literal("")),
});
export type MasayikhInput = z.infer<typeof masayikhSchema>;

export const heroSlideSchema = z.object({
  alt_text: z.string().trim().min(1, "Alt text wajib diisi").max(200),
  display_order: z.string().trim().optional().or(z.literal("")),
});
export type HeroSlideInput = z.infer<typeof heroSlideSchema>;

export const categorySchema = z.object({
  name: z.string().trim().min(1, "Nama kategori wajib diisi").max(80),
  tagline: z.string().trim().max(200).optional().or(z.literal("")),
  display_order: z.string().trim().optional().or(z.literal("")),
});
export type CategoryInput = z.infer<typeof categorySchema>;

export const topicSchema = z.object({
  label: z.string().trim().min(1, "Nama topik wajib diisi").max(80),
  description: z.string().trim().max(300).optional().or(z.literal("")),
  allow_featured: z.boolean(),
});
export type TopicInput = z.infer<typeof topicSchema>;

export const siteSettingsSchema = z.object({
  nama_organisasi: z.string().trim().max(150).optional().or(z.literal("")),
  tagline: z.string().trim().max(200).optional().or(z.literal("")),
  alamat: z.string().trim().max(500).optional().or(z.literal("")),
  email: z.string().trim().email("Format email tidak valid").optional().or(z.literal("")),
  telepon: z.string().trim().max(20).optional().or(z.literal("")),
  whatsapp: z.string().trim().max(20).optional().or(z.literal("")),
  instagram_url: z.string().trim().url("URL tidak valid").optional().or(z.literal("")),
  facebook_url: z.string().trim().url("URL tidak valid").optional().or(z.literal("")),
  youtube_url: z.string().trim().url("URL tidak valid").optional().or(z.literal("")),
  tiktok_url: z.string().trim().url("URL tidak valid").optional().or(z.literal("")),
  maps_embed_url: z.string().trim().url("URL tidak valid").optional().or(z.literal("")),
});
export type SiteSettingsInput = z.infer<typeof siteSettingsSchema>;
