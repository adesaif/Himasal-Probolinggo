import type { Metadata } from "next";
import Link from "next/link";

import { createPublicClient } from "@/lib/supabase/public";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Reveal } from "@/components/shared/reveal";
import { ScrollMorphHero } from "@/components/public/scroll-morph-hero";
import { ContentCard } from "@/components/public/content-card";
import { TOPIC_SELECT_COLUMNS } from "@/lib/topics";
import {
  fetchHomeSections,
  finalizeHeroSlides,
  type HomeCardItem,
  type HomeSection,
} from "@/lib/homepage-content";
import { fetchUnifiedContent, type UnifiedContentItem } from "@/lib/unified-content";

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
function CardGrid({ items, topicLabel }: { items: HomeCardItem[]; topicLabel: string }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6">
      {items.map((item) => (
        <ContentCard
          key={item.id}
          href={item.href}
          title={item.title}
          imageUrl={item.image_url}
          topicLabel={topicLabel}
          summary={item.summary}
          dateLabel={item.dateLabel}
        />
      ))}
    </div>
  );
}

// Grid Terbaru/Populer - beda dari CardGrid per-topik di atas karena
// setiap item BISA datang dari topik berbeda-beda (badge topik per-item,
// bukan satu topicLabel untuk seluruh grid).
function UnifiedCardGrid({ items }: { items: UnifiedContentItem[] }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:gap-6">
      {items.map((item) => (
        <ContentCard
          key={item.id}
          href={item.href}
          title={item.title}
          imageUrl={item.image_url}
          topicLabel={item.topicLabel}
          summary={item.summary}
          dateLabel={item.dateLabel}
        />
      ))}
    </div>
  );
}

// Terbaru & Populer sama-sama lintas topik (lihat lib/unified-content.ts) -
// heading tetap + "Lihat semua" ke arsip masing-masing, empty state kalau
// belum ada satu pun content yang memenuhi syarat (Terbaru: published apa
// pun; Populer: is_popular=true) - tidak pernah disembunyikan diam-diam
// supaya section topik di bawahnya tidak terasa "melompat".
function UnifiedSectionBlock({
  heading,
  viewAllHref,
  items,
}: {
  heading: string;
  viewAllHref: string;
  items: UnifiedContentItem[];
}) {
  return (
    <Reveal>
      <section>
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <h2 className="text-2xl font-semibold tracking-tight">{heading}</h2>
          <Button asChild variant="link" className="shrink-0">
            <Link href={viewAllHref}>Lihat semua</Link>
          </Button>
        </div>
        {items.length > 0 ? <UnifiedCardGrid items={items} /> : <EmptySectionState />}
      </section>
    </Reveal>
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
            <Link href={section.viewAllHref}>Lihat semua</Link>
          </Button>
        </div>
        {section.kind === "cards" ? (
          section.items.length > 0 ? (
            <CardGrid items={section.items} topicLabel={section.topicLabel} />
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

  // Terbaru & Populer lintas topik (lihat lib/unified-content.ts - hanya
  // dari news/events/gallery_items/topic_content, BUKAN dari
  // organization_profile/organization_structure/masayikh yang merupakan
  // data master, bukan publikasi bertanggal), lalu section per topik
  // sistem/custom seperti sebelumnya (fetchHomeSections, tidak diubah).
  const [terbaru, populer, others, { data: settings }] = await Promise.all([
    fetchUnifiedContent(supabase, topics, { limit: 6 }),
    fetchUnifiedContent(supabase, topics, { onlyPopular: true, limit: 6 }),
    fetchHomeSections(supabase, topics),
    supabase.from("site_settings").select("nama_organisasi, tagline").maybeSingle(),
  ]);

  const heroSlides = finalizeHeroSlides(others.heroCandidates);
  // Teks pusat Hero dari Pengaturan Situs (CMS), fallback sama persis dengan
  // footer - bukan copy demo.
  const brandName = settings?.nama_organisasi || "HIMASAL Probolinggo";
  const tagline = settings?.tagline || "Himpunan Alumni Santri Lirboyo Probolinggo";

  return (
    <div className="flex flex-col gap-16">
      {/* Hero: Scroll Morph - semua konten Unggulan (is_featured, published,
          topik mengizinkan Unggulan) dirender sekaligus dan digerakkan satu
          scroll progress native. 0-3 konten atau prefers-reduced-motion ->
          komposisi statis; tidak pernah dummy/duplikat. Lihat
          components/public/scroll-morph-hero.tsx. */}
      <ScrollMorphHero items={heroSlides} brandName={brandName} tagline={tagline} />

      {/* Terbaru: 6 content terbaru dari SEMUA topik (bukan hanya Berita) -
          menggantikan 3 section Berita-only (Terbaru/Minggu Lalu/Bulan
          Lalu) yang lama, karena section itu sekarang duplikat dengan ini
          (Berita tetap ikut tampil di sini, hanya tidak lagi py punya
          section homepage sendiri - lihat /berita untuk listing khusus
          Berita, dan /arsip untuk arsip lintas-topik lengkap). */}
      <UnifiedSectionBlock heading="Terbaru" viewAllHref="/arsip" items={terbaru.items} />

      {/* Populer: is_popular=true, flag editorial Admin - independen dari
          Hero (is_featured). Lihat /admin/berita untuk mengatur flag ini. */}
      <UnifiedSectionBlock heading="Populer" viewAllHref="/populer" items={populer.items} />

      {/* Satu section per topik AKTIF lainnya (sistem maupun custom)
          berurutan sesuai display_order - tidak diubah. Topik aktif
          SELALU mendapat section walau kontennya masih kosong - lihat
          EmptySectionState di HomeSectionBlock. */}
      {others.sections.map((section) => (
        <HomeSectionBlock key={section.topicKey} section={section} />
      ))}
    </div>
  );
}
