import { z } from "zod";

export const eventSchema = z
  .object({
    title: z.string().trim().min(1, "Judul wajib diisi").max(200),
    description: z.string().trim().max(2000).optional().or(z.literal("")),
    location: z.string().trim().max(200).optional().or(z.literal("")),
    start_at: z.string().trim().min(1, "Tanggal & waktu mulai wajib diisi"),
    end_at: z.string().trim().optional().or(z.literal("")),
    is_mandatory: z.boolean(),
    status: z.enum(["draft", "published"]),
  })
  .refine(
    (data) => !data.end_at || new Date(data.end_at) >= new Date(data.start_at),
    {
      message: "Waktu selesai tidak boleh sebelum waktu mulai",
      path: ["end_at"],
    },
  );

export type EventInput = z.infer<typeof eventSchema>;
