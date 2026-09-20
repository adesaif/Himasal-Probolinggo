import type { Metadata } from "next";
import Link from "next/link";

import { createPublicClient } from "@/lib/supabase/public";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { GalleryGrid } from "@/components/public/gallery-grid";

export const metadata: Metadata = {
  title: "Galeri",
  description: "Dokumentasi foto kegiatan HIMASAL Probolinggo.",
};

export const revalidate = 300;

const PAGE_SIZE = 12;

export default async function GaleriPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const { page: pageParam } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);
  const supabase = createPublicClient();

  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  const { data: items, error, count } = await supabase
    .from("gallery_items")
    .select("id, image_url, caption, created_at", { count: "exact" })
    .eq("is_published", true)
    .order("display_order")
    .order("created_at", { ascending: false })
    .range(from, to);

  const totalPages = Math.max(1, Math.ceil((count ?? 0) / PAGE_SIZE));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Galeri</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Dokumentasi foto kegiatan HIMASAL Probolinggo.
        </p>
      </div>

      {error ? (
        <Card>
          <CardContent className="py-8 text-center text-sm text-destructive">
            Gagal memuat galeri. Silakan coba lagi nanti.
          </CardContent>
        </Card>
      ) : !items || items.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            Belum ada foto di galeri.
          </CardContent>
        </Card>
      ) : (
        <GalleryGrid items={items} />
      )}

      {!error && (count ?? 0) > PAGE_SIZE ? (
        <div className="flex items-center justify-between text-sm">
          <p className="text-muted-foreground">
            Halaman {page} dari {totalPages}
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} asChild={page > 1}>
              {page > 1 ? (
                <Link href={`/galeri?page=${page - 1}`}>Sebelumnya</Link>
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
                <Link href={`/galeri?page=${page + 1}`}>Berikutnya</Link>
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
