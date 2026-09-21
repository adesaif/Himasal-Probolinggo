import type { Metadata } from "next";
import Link from "next/link";

import { createPublicClient } from "@/lib/supabase/public";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BeritaSearchInput } from "@/components/public/berita-search-input";
import { topicLabel } from "@/lib/topics";

export const metadata: Metadata = {
  title: "Berita",
  description: "Kabar dan informasi terbaru seputar HIMASAL Probolinggo.",
};

const PAGE_SIZE = 9;

export default async function BeritaPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string; category?: string }>;
}) {
  const { q, page: pageParam, category } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);
  const supabase = createPublicClient();

  let activeCategory: { id: string; name: string; slug: string } | null = null;
  if (category) {
    const { data } = await supabase
      .from("categories")
      .select("id, name, slug")
      .eq("slug", category)
      .eq("is_active", true)
      .maybeSingle();
    activeCategory = data;
  }

  const { data: topic } = await supabase
    .from("site_topics")
    .select("key, label")
    .eq("key", "berita")
    .maybeSingle();
  const beritaLabel = topicLabel(topic ? [topic] : null, "berita", "Berita");

  let query = supabase
    .from("news")
    .select("id, slug, title, excerpt, thumbnail_url, published_at, is_featured", {
      count: "exact",
    })
    .eq("status", "published");

  if (q?.trim()) {
    query = query.or(`title.ilike.%${q.trim()}%,excerpt.ilike.%${q.trim()}%`);
  }
  if (activeCategory) {
    query = query.eq("category_id", activeCategory.id);
  }

  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  const { data: newsList, error, count } = await query
    .order("published_at", { ascending: false })
    .range(from, to);

  const totalPages = Math.max(1, Math.ceil((count ?? 0) / PAGE_SIZE));

  function pageHref(targetPage: number) {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (category) params.set("category", category);
    params.set("page", String(targetPage));
    return `/berita?${params.toString()}`;
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          {activeCategory ? activeCategory.name : beritaLabel}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Kabar dan informasi terbaru seputar HIMASAL Probolinggo.
        </p>
        {activeCategory ? (
          <Link href="/berita" className="mt-1 inline-block text-sm text-primary hover:underline">
            ← Lihat semua berita
          </Link>
        ) : null}
      </div>

      <div className="max-w-sm">
        <BeritaSearchInput />
      </div>

      {error ? (
        <Card>
          <CardContent className="py-8 text-center text-sm text-destructive">
            Gagal memuat berita. Silakan coba lagi nanti.
          </CardContent>
        </Card>
      ) : !newsList || newsList.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            {q
              ? `Tidak ada berita yang cocok dengan "${q}".`
              : "Belum ada berita yang dipublikasikan."}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {newsList.map((item) => (
            <Link key={item.id} href={`/berita/${item.slug}`}>
              <Card className="card-hover h-full overflow-hidden">
                {item.thumbnail_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={item.thumbnail_url}
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
                  {item.is_featured ? (
                    <span className="w-fit rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                      Unggulan
                    </span>
                  ) : null}
                  <p className="font-medium">{item.title}</p>
                  {item.excerpt ? (
                    <p className="line-clamp-2 text-sm text-muted-foreground">
                      {item.excerpt}
                    </p>
                  ) : null}
                  {item.published_at ? (
                    <p className="text-xs text-muted-foreground">
                      {new Date(item.published_at).toLocaleDateString("id-ID", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })}
                    </p>
                  ) : null}
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}

      {!error && (count ?? 0) > PAGE_SIZE ? (
        <div className="flex items-center justify-between text-sm">
          <p className="text-muted-foreground">
            Halaman {page} dari {totalPages}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              asChild={page > 1}
            >
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
