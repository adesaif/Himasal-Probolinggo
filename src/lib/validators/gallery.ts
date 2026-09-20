import { z } from "zod";

export const galleryItemSchema = z.object({
  caption: z.string().trim().max(300).optional().or(z.literal("")),
  display_order: z.string().trim().optional().or(z.literal("")),
  is_published: z.boolean(),
});

export type GalleryItemInput = z.infer<typeof galleryItemSchema>;
