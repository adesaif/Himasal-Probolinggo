import Link from "next/link";

import { Card, CardContent } from "@/components/ui/card";

const SECTIONS = [
  {
    href: "/admin/konten/profil",
    title: "Profil Organisasi",
    description: "Sejarah, visi, misi, tujuan, dan deskripsi.",
  },
  {
    href: "/admin/konten/struktur",
    title: "Struktur Organisasi",
    description: "Kelola daftar pengurus dan jabatan.",
  },
  {
    href: "/admin/konten/masayikh",
    title: "Masayikh",
    description: "Kelola data masayikh.",
  },
  {
    href: "/admin/konten/hero",
    title: "Hero Carousel",
    description: "Kelola foto/wallpaper carousel hero beranda.",
  },
  {
    href: "/admin/konten/pengaturan",
    title: "Pengaturan Situs",
    description: "Nama organisasi, tagline, kontak, dan media sosial.",
  },
];

export default function AdminKontenPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Manajemen Konten
        </h1>
        <p className="text-sm text-muted-foreground">
          Kelola konten yang tampil di website publik. Berita, Agenda, dan
          Galeri akan tersedia di fase berikutnya.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {SECTIONS.map((section) => (
          <Link key={section.href} href={section.href}>
            <Card className="h-full transition-colors hover:bg-muted/50">
              <CardContent>
                <p className="font-medium">{section.title}</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {section.description}
                </p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
