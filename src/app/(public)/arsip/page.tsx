import type { Metadata } from "next";
import Link from "next/link";

import { createPublicClient } from "@/lib/supabase/public";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ContentCard } from "@/components/public/content-card";
import { formatArchiveBucketLabel } from "@/lib/format-date";
import { TOPIC_SELECT_COLUMNS } from "@/lib/topics";
import { fetchUnifiedContent, type UnifiedContentItem } from "@/lib/unified-content";

export const metadata: Metadata = {
  title: "Arsip",
  description:
    "Seluruh konten yang pernah dipublikasikan HIMASAL Probolinggo dari semua topik, dari yang terbaru hingga yang terlama.",
};

// force-dynamic, sama seperti Beranda - arsip harus langsung mencerminkan
// konten yang baru dipublikasikan dari topik mana pun.
export const dynamic = "force-dynamic";

const PAGE_SIZE = 24;

/**
 * "Lihat semua" dari section Terbaru di Beranda - arsip LENGKAP (tanpa
 * batas 6, tanpa batas waktu) dari seluruh published content lintas topik,
 * lihat lib/unified-content.ts. Dikelompokkan per heading bulan/tahun (atau
 * "Minggu Ini") berdasarkan tanggal asli tiap item - BUKAN satu bucket
 * generik "lebih lama" - supaya konten minggu lalu/bulan lalu/tahun lalu
 * semuanya tetap bisa ditemukan lewat heading + nomor halaman, tidak pernah
 * terkubur.
 */
export default async function ArsipPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const { page: pageParam } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);
  const supabase = createPublicClient();

  const { data: topics } = await supabase.from("site_topics").select(TOPIC_SELECT_COLUMNS);
  const { items, total } = await fetchUnifiedContent(supabase, topics, {
    page: page - 1,
    pageSize: PAGE_SIZE,
  });

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  function pageHref(targetPage: number) {
    return `/arsip?page=${targetPage}`;
  }

  // Item halaman ini (sudah terurut sortDate desc dari fetchUnifiedContent)
  // dipecah jadi grup setiap kali label bulan/tahunnya berubah - heading
  // yang sama bisa berulang di halaman berikutnya kalau satu bulan
  // melintasi batas halaman (kosmetik ringan, tidak kehilangan konten apa
  // pun karena setiap item tetap muncul persis satu kali di seluruh arsip).
  const groups: { label: string; items: UnifiedContentItem[] }[] = [];
  for (const item of items) {
    const label = formatArchiveBucketLabel(item.sortDate);
    const last = groups[groups.length - 1];
    if (last && last.label === label) {
      last.items.push(item);
    } else {
      groups.push({ label, items: [item] });
    }
  }

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Arsip</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Seluruh konten yang pernah dipublikasikan, dari semua topik, terbaru hingga terlama.
        </p>
      </div>

      {items.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            Belum ada konten yang dipublikasikan.
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-10">
          {groups.map((group, index) => (
            <section key={`${group.label}-${index}`}>
              <h2 className="mb-4 text-lg font-semibold tracking-tight text-muted-foreground">
                {group.label}
              </h2>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:gap-6">
                {group.items.map((item) => (
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
            </section>
          ))}
        </div>
      )}

      {total > PAGE_SIZE ? (
        <div className="flex items-center justify-between text-sm">
          <p className="text-muted-foreground">
            Halaman {page} dari {totalPages}
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} asChild={page > 1}>
              {page > 1 ? (
                <Link href={pageHref(page - 1)}>Sebelumnya</Link>
              ) : (
                <span>Sebelumnya</span>
              )}
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              asChild={page < totalPages}
            >
              {page < totalPages ? (
                <Link href={pageHref(page + 1)}>Berikutnya</Link>
              ) : (
                <span>Berikutnya</span>
              )}
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
