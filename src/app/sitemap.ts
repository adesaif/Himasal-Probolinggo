import type { MetadataRoute } from "next";

const PUBLIC_ROUTES = ["", "/profil", "/struktur", "/masayikh", "/kontak"];

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

  return PUBLIC_ROUTES.map((path) => ({
    url: `${baseUrl}${path}`,
    lastModified: new Date(),
  }));
}
