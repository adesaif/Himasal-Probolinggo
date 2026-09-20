import Link from "next/link";

import { createClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { TOPIC_SELECT_COLUMNS, topicLabel, type SiteTopic } from "@/lib/topics";

function buildSections(topics: SiteTopic[] | null) {
  return [
    {
      href: "/admin/konten/profil",
      title: topicLabel(topics, "profil", "Profil"),
      description: "Sejarah, visi, misi, tujuan, dan deskripsi.",
    },
    {
      href: "/admin/konten/struktur",
      title: topicLabel(topics, "struktur", "Struktur"),
      description: "Kelola daftar pengurus dan jabatan.",
    },
    {
      href: "/admin/konten/masayikh",
      title: topicLabel(topics, "masayikh", "Masayikh"),
      description: "Kelola data masayikh.",
    },
    {
      href: "/admin/konten/kategori",
      title: "Kategori Berita",
      description: "Kelola kategori, tagline, urutan, dan tampilan di Beranda.",
    },
    {
      href: "/admin/konten/topik",
      title: "Topik & Navigasi",
      description:
        "Rename, aktif/nonaktif, urutan, dan izin Unggulan untuk tiap topik website.",
    },
    {
      href: "/admin/konten/pengaturan",
      title: "Pengaturan Situs",
      description: "Nama organisasi, tagline, kontak, dan media sosial.",
    },
  ];
}

export default async function AdminKontenPage() {
  const supabase = await createClient();
  const { data: topics } = await supabase
    .from("site_topics")
    .select(TOPIC_SELECT_COLUMNS);
  const sections = buildSections(topics);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Manajemen Konten
        </h1>
        <p className="text-sm text-muted-foreground">
          Kelola konten yang tampil di website publik. Berita, Agenda, dan
          Galeri dikelola dari menu sidebar masing-masing.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {sections.map((section) => (
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
