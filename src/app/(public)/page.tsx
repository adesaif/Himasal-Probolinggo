import type { Metadata } from "next";
import Link from "next/link";

import { createPublicClient } from "@/lib/supabase/public";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Reveal } from "@/components/shared/reveal";
import { HeroCarousel } from "@/components/public/hero-carousel";
import { TOPIC_SELECT_COLUMNS } from "@/lib/topics";
import { fetchHomeSections, type HomeCardItem, type HomeSection } from "@/lib/homepage-content";

export const metadata: Metadata = {
  title: "Beranda",
  description:
    "Website resmi Himpunan Alumni Santri Lirboyo (HIMASAL) Probolinggo.",
};

// Beranda selalu dirender fresh per-request (bukan ISR statis) supaya
// konten dari CMS Admin (topik mana pun) langsung tampil tanpa menunggu
// revalidasi.
export const dynamic = "force-dynamic";

function CardGrid({ items }: { items: HomeCardItem[] }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {items.map((item) => (
        <Link key={item.id} href={item.href}>
          <Card className="card-hover h-full overflow-hidden">
            {item.image_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={item.image_url}
                alt={item.title}
                loading="lazy"
                className="aspect-video w-full object-cover"
              />
            ) : (
              <div className="flex aspect-video w-full items-center justify-center bg-muted text-sm text-muted-foreground">
                Tidak ada gambar
              </div>
            )}
            <CardContent className="flex flex-col gap-1">
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

// Satu-satunya renderer section Beranda - dipanggil untuk SETIAP topik
// aktif (sistem maupun custom) berdasarkan `section.kind` yang dihasilkan
// registry di lib/homepage-content.ts. TIDAK ADA "if key === 'berita' ..."
// di sini - topik baru otomatis dapat section begitu punya konten, tanpa
// menambah JSX baru.
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
          <CardGrid items={section.items} />
        ) : (
          <p className="max-w-2xl text-muted-foreground">{section.body}</p>
        )}
      </section>
    </Reveal>
  );
}

export default async function BerandaPage() {
  const supabase = createPublicClient();

  const { data: topics } = await supabase.from("site_topics").select(TOPIC_SELECT_COLUMNS);

  const { sections, heroSlides } = await fetchHomeSections(supabase, topics);

  return (
    <div className="flex flex-col gap-16">
      {/* Hero: portal konten - foto + judul asli dari konten Unggulan topik
          mana pun yang aktif & mengizinkan Unggulan. Kalau tidak ada
          konten unggulan, HeroCarousel return null dan section ini jatuh
          ke background gradient premium saja - tidak pernah menampilkan
          dummy slide. */}
      <section className="hero-premium-bg relative z-0 h-[340px] overflow-hidden rounded-2xl sm:h-[400px] lg:h-[440px]">
        <HeroCarousel slides={heroSlides} />
      </section>

      {/* Satu section per topik aktif, berurutan sesuai display_order.
          Section yang kosong (topiknya aktif tapi belum ada konten) tidak
          pernah dirender - lihat fetchHomeSections. */}
      {sections.map((section) => (
        <HomeSectionBlock key={section.topicKey} section={section} />
      ))}
    </div>
  );
}
