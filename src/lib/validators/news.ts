import { z } from "zod";

export const newsSchema = z.object({
  title: z.string().trim().min(1, "Judul wajib diisi").max(200),
  excerpt: z.string().trim().max(300).optional().or(z.literal("")),
  content: z.string().trim().min(1, "Isi berita wajib diisi"),
  topic_id: z.string().trim().min(1, "Topik wajib dipilih"),
  author_name: z.string().trim().max(100).optional().or(z.literal("")),
  is_featured: z.boolean(),
  status: z.enum(["draft", "published"]),
});

export type NewsInput = z.infer<typeof newsSchema>;
