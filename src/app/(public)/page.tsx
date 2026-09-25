import type { Metadata } from "next";
import Link from "next/link";

import { createPublicClient } from "@/lib/supabase/public";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Reveal } from "@/components/shared/reveal";
import { HeroCarousel } from "@/components/public/hero-carousel";
import { TOPIC_SELECT_COLUMNS } from "@/lib/topics";
import {
  fetchBeritaSections,
  fetchHomeSections,
  finalizeHeroSlides,
  type HomeCardItem,
  type HomeSection,
} from "@/lib/homepage-content";

export const metadata: Metadata = {
  title: "Beranda",
  description:
    "Website resmi Himpunan Alumni Santri Lirboyo (HIMASAL) Probolinggo.",
};

// Beranda selalu dirender fresh per-request (bukan ISR statis) supaya
// konten dari CMS Admin (topik mana pun) langsung tampil tanpa menunggu
// revalidasi.
export const dynamic = "force-dynamic";

// Catatan: sempat dicoba membatasi jumlah kolom mengikuti jumlah item
// (supaya section dengan 1 kartu tidak menyisakan 3 kolom kosong), tapi
// verifikasi visual nyata menunjukkan itu regresi lebih buruk - grid-
// cols-1 membuat SATU kartu meregang penuh ke lebar container (aspect-
// video jadi raksasa ~650px tinggi). Ruang kosong di sisa kolom untuk
// section yang baru punya sedikit konten adalah pola yang wajar dan
// tidak rusak, jadi grid tetap - kolom (1/2/4) TIDAK bergantung jumlah
// item.
function CardGrid({ items }: { items: HomeCardItem[] }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {items.map((item) => (
        <Link key={item.id} href={item.href}>
          {/* Card bawaan punya py-6 + gap-6 (lihat ui/card.tsx) - kalau
              tidak di-nol-kan, foto (walau sudah object-cover) tetap
              keinset ~24px dari tepi atas/bawah Card oleh padding itu,
              jadi foto terlihat "tidak memenuhi" walau CSS object-fit-nya
              sudah benar. gap-0 py-0 di sini + padding manual di
              CardContent supaya foto benar-benar rapat ke tepi Card. */}
          <Card className="card-hover h-full gap-0 overflow-hidden py-0">
            {item.image_url ? (
              // object-contain (bukan object-cover) supaya foto berita
              // selalu utuh - tidak pernah memotong wajah/objek penting.
              // bg-muted mengisi ruang kosong kiri-kanan/atas-bawah kalau
              // rasio foto beda dari aspect-video, bukan dibiarkan
              // transparan/putih kosong.
              <div className="relative aspect-video w-full overflow-hidden bg-muted">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={item.image_url}
                  alt={item.title}
                  loading="lazy"
                  className="absolute inset-0 size-full object-contain"
                />
              </div>
            ) : (
              <div className="flex aspect-video w-full items-center justify-center bg-muted text-sm text-muted-foreground">
                Tidak ada gambar
              </div>
            )}
            <CardContent className="flex flex-col gap-1 p-4">
              <p className="line-clamp-2 font-medium">{item.title}</p>
              {item.subtitle ? (
                <p className="line-clamp-1 text-xs text-muted-foreground">{item.subtitle}</p>
              ) : null}
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  );
}

// Sama persis dengan pola empty state di seluruh situs (Berita/Agenda/
// Galeri/admin lists): Card + CardContent, py-8, text-center, text-sm
// text-muted-foreground - bukan gaya lain supaya Beranda terasa satu
// desain dengan halaman lainnya.
function EmptySectionState() {
  return (
    <Card>
      <CardContent className="py-8 text-center text-sm text-muted-foreground">
        Belum ada konten di bagian ini.
      </CardContent>
    </Card>
  );
}

// Satu-satunya renderer section Beranda - dipanggil untuk SETIAP topik
// AKTIF (sistem maupun custom) berdasarkan `section.kind` yang dihasilkan
// registry di lib/homepage-content.ts. TIDAK ADA "if key === 'berita' ..."
// di sini - topik baru otomatis dapat section tanpa menambah JSX baru.
// Section topik aktif SELALU dirender walau kontennya kosong - lihat
// EmptySectionState di atas - bukan disembunyikan dan bukan diisi data
// dummy.
function HomeSectionBlock({ section }: { section: HomeSection }) {
  return (
    <Reveal>
      <section>
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <h2 className="text-2xl font-semibold tracking-tight">{section.heading}</h2>
          <Button asChild variant="link" className="shrink-0">
            <Link href={section.viewAllHref}>Lihat semua →</Link>
          </Button>
        </div>
        {section.kind === "cards" ? (
          section.items.length > 0 ? (
            <CardGrid items={section.items} />
          ) : (
            <EmptySectionState />
          )
        ) : section.body ? (
          <p className="max-w-2xl text-muted-foreground">{section.body}</p>
        ) : (
          <EmptySectionState />
        )}
      </section>
    </Reveal>
  );
}

export default async function BerandaPage() {
  const supabase = createPublicClient();

  const { data: topics } = await supabase.from("site_topics").select(TOPIC_SELECT_COLUMNS);

  // Berita punya 3 section tetap (Terbaru/Satu Minggu Lalu/Satu Bulan
  // Lalu) - requirement yang berdiri sendiri, BUKAN bagian dari loop topik
  // generik di bawah. Dilewati sepenuhnya (termasuk hero-nya) kalau topik
  // Berita dinonaktifkan.
  const beritaTopic = topics?.find((t) => t.key === "berita" && t.is_active);
  const [berita, others] = await Promise.all([
    beritaTopic
      ? fetchBeritaSections(supabase, beritaTopic)
      : Promise.resolve({ sections: [] as HomeSection[], heroCandidates: [] }),
    fetchHomeSections(supabase, topics),
  ]);

  const heroSlides = finalizeHeroSlides([...berita.heroCandidates, ...others.heroCandidates]);

  return (
    <div className="flex flex-col gap-16">
      {/* Hero: portal konten - foto + judul asli dari konten Unggulan topik
          mana pun yang aktif & mengizinkan Unggulan. Kalau tidak ada
          konten unggulan, HeroCarousel return null dan section ini jatuh
          ke background gradient premium saja - tidak pernah menampilkan
          dummy slide. Foto memenuhi seluruh kotak (object-cover di
          HeroCarousel) - Hero yang lebih tinggi jadi terasa lebih
          immersive/premium, bukan sekadar memberi ruang untuk foto kecil
          seperti sebelumnya. */}
      <section className="hero-premium-bg relative z-0 h-[420px] overflow-hidden rounded-2xl sm:h-[480px] lg:h-[560px]">
        <HeroCarousel slides={heroSlides} />
      </section>

      {/* Tiga section Berita tetap (disembunyikan per bucket kalau bucket
          itu kosong - lihat fetchBeritaSections), lalu satu section per
          topik AKTIF lainnya berurutan sesuai display_order. Topik aktif
          lain SELALU mendapat section walau kontennya masih kosong - lihat
          EmptySectionState di HomeSectionBlock. */}
      {berita.sections.map((section) => (
        <HomeSectionBlock key={section.topicKey} section={section} />
      ))}
      {others.sections.map((section) => (
        <HomeSectionBlock key={section.topicKey} section={section} />
      ))}
    </div>
  );
}
