import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { createPublicClient } from "@/lib/supabase/public";
import { Button } from "@/components/ui/button";

export const revalidate = 300;

async function getNews(slug: string) {
  const supabase = createPublicClient();
  const { data } = await supabase
    .from("news")
    .select("title, excerpt, content, thumbnail_url, author_name, category, published_at")
    .eq("slug", slug)
    .eq("status", "published")
    .single();
  return data;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const news = await getNews(slug);

  if (!news) {
    return { title: "Berita tidak ditemukan" };
  }

  return {
    title: news.title,
    description: news.excerpt ?? undefined,
    openGraph: {
      title: news.title,
      description: news.excerpt ?? undefined,
      images: news.thumbnail_url ? [news.thumbnail_url] : undefined,
    },
  };
}

export default async function BeritaDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const news = await getNews(slug);

  if (!news) {
    notFound();
  }

  return (
    <article className="mx-auto flex max-w-2xl flex-col gap-4">
      <Button variant="ghost" size="sm" asChild className="w-fit">
        <Link href="/berita">
          <ArrowLeft />
          Kembali ke Berita
        </Link>
      </Button>

      {news.thumbnail_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={news.thumbnail_url}
          alt={news.title}
          className="aspect-video w-full rounded-lg object-cover"
        />
      ) : null}

      <div>
        {news.category ? (
          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
            {news.category}
          </span>
        ) : null}
        <h1 className="mt-2 text-3xl font-bold tracking-tight">{news.title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {news.author_name ? `${news.author_name} · ` : ""}
          {news.published_at
            ? new Date(news.published_at).toLocaleDateString("id-ID", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })
            : ""}
        </p>
      </div>

      <div className="whitespace-pre-line leading-relaxed text-foreground">
        {news.content}
      </div>
    </article>
  );
}
