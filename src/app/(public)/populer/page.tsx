import type { Metadata } from "next";
import Link from "next/link";

import { createPublicClient } from "@/lib/supabase/public";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ContentCard } from "@/components/public/content-card";
import { TOPIC_SELECT_COLUMNS } from "@/lib/topics";
import { fetchUnifiedContent } from "@/lib/unified-content";

export const metadata: Metadata = {
  title: "Populer",
  description: "Konten pilihan HIMASAL Probolinggo dari semua topik.",
};

export const dynamic = "force-dynamic";

const PAGE_SIZE = 24;

/**
 * "Lihat semua" dari section Populer di Beranda - SELURUH content dengan
 * is_popular=true (flag editorial Admin, lihat lib/unified-content.ts),
 * tidak dibatasi 6. Urutan tetap sortDate desc (konsisten dengan Terbaru),
 * tanpa pengelompokan waktu - spek hanya minta urutan konsisten di sini.
 */
export default async function PopulerPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const { page: pageParam } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);
  const supabase = createPublicClient();

  const { data: topics } = await supabase.from("site_topics").select(TOPIC_SELECT_COLUMNS);
  const { items, total } = await fetchUnifiedContent(supabase, topics, {
    onlyPopular: true,
    page: page - 1,
    pageSize: PAGE_SIZE,
  });

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  function pageHref(targetPage: number) {
    return `/populer?page=${targetPage}`;
  }

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Populer</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Konten pilihan dari semua topik, ditandai Admin sebagai Populer.
        </p>
      </div>

      {items.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            Belum ada konten yang ditandai Populer.
          </CardContent>
        </Card>
      ) : (
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
