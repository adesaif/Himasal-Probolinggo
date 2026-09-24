import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { createPublicClient } from "@/lib/supabase/public";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatDateID } from "@/lib/format-date";
import { topicHref } from "@/lib/topics";

export const revalidate = 300;

const PAGE_SIZE = 12;

async function loadTopic(slug: string) {
  const supabase = createPublicClient();
  const { data: topic } = await supabase
    .from("site_topics")
    .select("id, key, label, description, is_active, is_system")
    .eq("key", slug)
    .eq("is_active", true)
    .maybeSingle();
  return { supabase, topic };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const { topic } = await loadTopic(slug);
  return {
    title: topic?.label ?? "Topik",
    description: topic?.description ?? undefined,
  };
}

export default async function GenericTopicPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const { slug } = await params;
  const { page: pageParam } = await searchParams;
  const { supabase, topic } = await loadTopic(slug);

  if (!topic) notFound();

  // Topik sistem punya halaman publik khusus (mis. /berita, /galeri) -
  // /topik/[slug] hanya untuk topik generik (Konten + custom).
  if (topic.is_system) {
    redirect(topicHref(topic));
  }

  const page = Math.max(1, Number(pageParam) || 1);

  // Konten topik ini datang dari DUA tabel - topic_content (konten generik)
  // dan news yang Admin tandai Topik-nya ke topik ini (lihat homepage-
  // content.ts, pola yang sama). Karena Supabase tidak bisa UNION+range
  // dua tabel dalam satu query, ambil keduanya (dibatasi wajar, bukan
  // seluruh tabel), gabung + urutkan + paginate di sini - aman untuk
  // volume konten organisasi kecil seperti ini.
  const FETCH_CAP = 200;
  const [{ data: topicContentRows, error: topicContentError }, { data: newsRows, error: newsError }] =
    await Promise.all([
      supabase
        .from("topic_content")
        .select("id, title, description, image_url, link_url, created_at")
        .eq("topic_id", topic.id)
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(FETCH_CAP),
      supabase
        .from("news")
        .select("id, title, excerpt, thumbnail_url, slug, published_at")
        .eq("topic_id", topic.id)
        .eq("status", "published")
        .not("published_at", "is", null)
        .order("published_at", { ascending: false })
        .limit(FETCH_CAP),
    ]);

  const error = topicContentError || newsError;

  type ListItem = {
    id: string;
    title: string;
    description: string | null;
    image_url: string | null;
    link_url: string | null;
    sortDate: string;
  };

  const combined: ListItem[] = [
    ...(topicContentRows ?? []).map((c) => ({
      id: `topic-content-${c.id}`,
      title: c.title,
      description: c.description,
      image_url: c.image_url,
      link_url: c.link_url,
      sortDate: c.created_at,
    })),
    ...(newsRows ?? []).map((n) => ({
      id: `news-${n.id}`,
      title: n.title,
      description: n.excerpt,
      image_url: n.thumbnail_url,
      link_url: `/berita/${n.slug}`,
      sortDate: n.published_at ?? "",
    })),
  ].sort((a, b) => (a.sortDate < b.sortDate ? 1 : -1));

  const count = combined.length;
  const from = (page - 1) * PAGE_SIZE;
  const items = combined.slice(from, from + PAGE_SIZE);

  const totalPages = Math.max(1, Math.ceil(count / PAGE_SIZE));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">{topic.label}</h1>
        {topic.description ? (
          <p className="mt-1 text-sm text-muted-foreground">{topic.description}</p>
        ) : null}
      </div>

      {error ? (
        <Card>
          <CardContent className="py-8 text-center text-sm text-destructive">
            Gagal memuat konten. Silakan coba lagi nanti.
          </CardContent>
        </Card>
      ) : !items || items.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            Belum ada konten di topik ini.
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => {
            const content = (
              // Card bawaan punya py-6 + gap-6 (ui/card.tsx) - dinolkan di
              // sini supaya foto benar-benar rapat ke tepi Card, bukan
              // ke-inset oleh padding default.
              <Card className="card-hover h-full gap-0 overflow-hidden py-0">
                {item.image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={item.image_url}
                    alt={item.title}
                    loading="lazy"
                    className="aspect-video w-full object-cover"
                  />
                ) : null}
                <CardContent className="flex flex-col gap-1 p-4">
                  <p className="font-medium">{item.title}</p>
                  {item.description ? (
                    <p className="line-clamp-3 text-sm text-muted-foreground">
                      {item.description}
                    </p>
                  ) : null}
                  <p className="text-xs text-muted-foreground">
                    {item.sortDate ? formatDateID(item.sortDate) : null}
                  </p>
                </CardContent>
              </Card>
            );
            if (item.link_url?.startsWith("/")) {
              return (
                <Link key={item.id} href={item.link_url}>
                  {content}
                </Link>
              );
            }
            return item.link_url ? (
              <a key={item.id} href={item.link_url} target="_blank" rel="noopener noreferrer">
                {content}
              </a>
            ) : (
              <div key={item.id}>{content}</div>
            );
          })}
        </div>
      )}

      {!error && (count ?? 0) > PAGE_SIZE ? (
        <div className="flex items-center justify-between text-sm">
          <p className="text-muted-foreground">
            Halaman {page} dari {totalPages}
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} asChild={page > 1}>
              {page > 1 ? (
                <Link href={`/topik/${topic.key}?page=${page - 1}`}>Sebelumnya</Link>
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
                <Link href={`/topik/${topic.key}?page=${page + 1}`}>Berikutnya</Link>
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
