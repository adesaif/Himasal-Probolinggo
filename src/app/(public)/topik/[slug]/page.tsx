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
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  const { data: items, error, count } = await supabase
    .from("topic_content")
    .select("id, title, description, image_url, link_url, created_at", { count: "exact" })
    .eq("topic_id", topic.id)
    .eq("is_active", true)
    .order("display_order")
    .order("created_at", { ascending: false })
    .range(from, to);

  const totalPages = Math.max(1, Math.ceil((count ?? 0) / PAGE_SIZE));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{topic.label}</h1>
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
              <Card className="card-hover h-full overflow-hidden">
                {item.image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={item.image_url}
                    alt={item.title}
                    loading="lazy"
                    className="aspect-video w-full object-cover"
                  />
                ) : null}
                <CardContent className="flex flex-col gap-1">
                  <p className="font-medium">{item.title}</p>
                  {item.description ? (
                    <p className="line-clamp-3 text-sm text-muted-foreground">
                      {item.description}
                    </p>
                  ) : null}
                  <p className="text-xs text-muted-foreground">
                    {formatDateID(item.created_at)}
                  </p>
                </CardContent>
              </Card>
            );
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
