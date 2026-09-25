import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { createPublicClient } from "@/lib/supabase/public";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatCardDateTimeID } from "@/lib/format-date";

export const revalidate = 300;

async function getNews(slug: string) {
  const supabase = createPublicClient();
  const { data } = await supabase
    .from("news")
    .select(
      "title, excerpt, content, thumbnail_url, author_name, published_at, topic_id, site_topics(label)",
    )
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

  // Paragraf dipisah dari baris kosong pada `content` mentah supaya jarak
  // antar-paragraf terasa seperti artikel portal berita (bukan satu blok
  // teks) - murni presentasi, TIDAK mengubah/menulis ulang isi. Kalau
  // datanya cuma satu blok tanpa baris kosong, hasilnya tetap satu paragraf
  // seperti sebelumnya (tidak ada regresi untuk konten pendek).
  const paragraphs = news.content
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);

  return (
    <article className="mx-auto flex max-w-2xl flex-col gap-6">
      <Button variant="ghost" size="sm" asChild className="w-fit">
        <Link href="/berita">
          <ArrowLeft />
          Kembali ke Berita
        </Link>
      </Button>

      {/* Header artikel: Topik -> Judul -> tanggal+jam WIB, SEBELUM foto -
          urutan portal berita profesional, judul jadi elemen paling
          dominan alih-alih tersembunyi di bawah foto. */}
      <div className="flex flex-col gap-3">
        {news.site_topics?.label ? (
          <Badge variant="primary" className="w-fit">
            {news.site_topics.label}
          </Badge>
        ) : null}
        <h1 className="text-3xl leading-tight font-bold tracking-tight text-balance sm:text-4xl">
          {news.title}
        </h1>
        <p className="text-sm text-muted-foreground">
          {news.author_name ? `${news.author_name} · ` : ""}
          {news.published_at ? formatCardDateTimeID(news.published_at) : ""}
        </p>
      </div>

      {/* Foto utama - TIDAK di-crop, TIDAK dipaksa aspect ratio: <img>
          natural (width 100%, height auto) supaya portrait/landscape/
          square semuanya tampil utuh, beda dari card grid (yang memang
          boleh crop terkontrol demi grid). */}
      {news.thumbnail_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={news.thumbnail_url}
          alt={news.title}
          className="block h-auto w-full rounded-2xl border"
        />
      ) : null}

      {/* Ringkasan/dek - HANYA kalau excerpt tersedia, tidak pernah
          placeholder. Lebih besar dari body, lebih ringan dari headline. */}
      {news.excerpt ? (
        <p className="text-lg leading-relaxed text-muted-foreground sm:text-xl">
          {news.excerpt}
        </p>
      ) : null}

      <div className="flex flex-col gap-5 text-base leading-relaxed text-foreground sm:text-[17px]">
        {paragraphs.map((paragraph, i) => (
          <p key={i} className="whitespace-pre-line">
            {paragraph}
          </p>
        ))}
      </div>
    </article>
  );
}
