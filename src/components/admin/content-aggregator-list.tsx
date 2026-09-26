"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, ExternalLink, Search, FolderOpen } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { NewsFormDialog } from "@/components/admin/news-form-dialog";
import { createClient } from "@/lib/supabase/client";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { cleanupStorageFileIfUnused } from "@/lib/storage-cleanup";
import { fetchUnifiedContent, type UnifiedContentItem } from "@/lib/unified-content";
import type { SiteTopic } from "@/lib/topics";

type TopicOption = Pick<
  SiteTopic,
  "id" | "key" | "label" | "is_active" | "is_system" | "allow_featured"
>;

const PAGE_SIZE = 10;
const ALL_VALUE = "__all__";

// Kelola untuk sumber selain `news` selalu link keluar ke halaman admin
// aslinya (bukan editor inline baru) - lihat plan Section E: Berita adalah
// VIEW/AGGREGATOR, bukan editor universal. Dipetakan dari prefix id
// (news-/event-/gallery-/topic-content-, lihat unified-content.ts), bukan
// topic key, karena satu topic key bisa saja berisi campuran sumber.
function manageHref(item: UnifiedContentItem, topics: TopicOption[]): string | null {
  if (item.id.startsWith("event-")) return "/admin/agenda";
  if (item.id.startsWith("gallery-")) return "/admin/galeri";
  if (item.id.startsWith("topic-content-")) {
    const topic = topics.find((t) => t.key === item.topicKey);
    return topic ? `/admin/konten/topik/${topic.id}/konten` : null;
  }
  return null;
}

/**
 * Admin > Berita - AGGREGATOR seluruh published content lintas topik
 * (news/events/gallery_items/topic_content, lihat lib/unified-content.ts),
 * bukan lagi hanya tabel `news`. Baris bersumber `news` tetap dikelola
 * inline lewat NewsFormDialog yang sudah ada (termasuk draft - Admin masih
 * bisa membuat/mempublikasikan berita dari sini persis seperti sebelumnya).
 * Baris dari sumber lain (Agenda/Galeri/Konten topik) hanya menampilkan
 * link "Kelola" ke halaman admin aslinya - tidak ada editor baru dibuat di
 * sini, dan tidak ada baris yang pernah disalin/digandakan ke tabel lain.
 */
export function ContentAggregatorList({ topics }: { topics: TopicOption[] }) {
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 350);
  const [statusFilter, setStatusFilter] = useState(ALL_VALUE);
  const [topicFilter, setTopicFilter] = useState(ALL_VALUE);
  const [page, setPage] = useState(0);

  const [items, setItems] = useState<UnifiedContentItem[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const filterKey = `${debouncedSearch}|${statusFilter}|${topicFilter}`;
  const [prevFilterKey, setPrevFilterKey] = useState(filterKey);
  if (filterKey !== prevFilterKey) {
    setPrevFilterKey(filterKey);
    setPage(0);
  }

  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setIsLoading(true);
      setError(null);
      const supabase = createClient();

      try {
        const { items: allMatching, total: matchingTotal } = await fetchUnifiedContent(
          supabase,
          topics,
          {
            includeAllNewsStatuses: true,
            search: debouncedSearch,
            topicKey: topicFilter !== ALL_VALUE ? topicFilter : undefined,
          },
        );
        // Status (Draft/Published) hanya relevan untuk baris `news` - baris
        // sumber lain sudah pasti "published" (query-nya sendiri sudah
        // menyaring), jadi filter status tidak pernah menyembunyikan
        // baris non-news.
        const filtered =
          statusFilter === ALL_VALUE
            ? allMatching
            : allMatching.filter(
                (item) => !item.id.startsWith("news-") || item.newsStatus === statusFilter,
              );

        if (cancelled) return;
        setTotal(filtered.length);
        setItems(filtered.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE));
        void matchingTotal;
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Gagal memuat data");
        setItems([]);
        setTotal(0);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch, statusFilter, topicFilter, page, reloadKey]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  async function handleDeleteNews(item: UnifiedContentItem) {
    const newsId = item.id.replace(/^news-/, "");
    setBusyId(item.id);
    const supabase = createClient();
    const { data: row } = await supabase
      .from("news")
      .select("thumbnail_url")
      .eq("id", newsId)
      .maybeSingle();
    const { error } = await supabase.from("news").delete().eq("id", newsId);

    if (error) {
      setBusyId(null);
      toast.error("Gagal menghapus berita", { description: error.message });
      return;
    }

    if (row?.thumbnail_url) {
      await cleanupStorageFileIfUnused(supabase, row.thumbnail_url, async () => {
        const { count } = await supabase
          .from("news")
          .select("id", { count: "exact", head: true })
          .eq("thumbnail_url", row.thumbnail_url as string);
        return (count ?? 0) > 0;
      });
    }

    setBusyId(null);
    toast.success("Berita berhasil dihapus permanen");
    setReloadKey((k) => k + 1);
  }

  async function toggleNewsStatus(item: UnifiedContentItem) {
    const newsId = item.id.replace(/^news-/, "");
    const nextStatus = item.newsStatus === "published" ? "draft" : "published";
    setBusyId(item.id);
    const supabase = createClient();
    const { error } = await supabase
      .from("news")
      .update({
        status: nextStatus,
        published_at: nextStatus === "published" ? new Date().toISOString() : null,
      })
      .eq("id", newsId);
    setBusyId(null);

    if (error) {
      toast.error("Gagal mengubah status", { description: error.message });
      return;
    }
    toast.success(nextStatus === "published" ? "Berita dipublikasikan" : "Berita dijadikan draft");
    setReloadKey((k) => k + 1);
  }

  return (
    <div className="flex flex-col gap-4">
      <AdminPageHeader
        title="Berita"
        description="Aggregator seluruh konten yang sudah dipublikasikan dari semua topik (Berita, Agenda, Galeri, dan topik custom). Konten Berita dikelola langsung di sini; konten dari topik lain ditandai sumbernya, klik Kelola untuk membuka halaman pengelolaannya."
        actions={
          <NewsFormDialog
            topics={topics}
            trigger={
              <Button>
                <Plus />
                Tambah Berita
              </Button>
            }
          />
        }
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
        <div className="relative sm:col-span-2">
          <Search className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Cari judul..."
            className="pl-8"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={topicFilter} onValueChange={setTopicFilter}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Semua topik" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_VALUE}>Semua topik</SelectItem>
            {topics.map((t) => (
              <SelectItem key={t.id} value={t.key}>
                {t.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Semua status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_VALUE}>Semua status</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="published">Published</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      ) : error ? (
        <Card>
          <CardContent className="py-8 text-center text-sm text-destructive">
            Gagal memuat data: {error}
          </CardContent>
        </Card>
      ) : items.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            Tidak ada konten yang cocok.
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-2">
          {items.map((item) => {
            const isNews = item.id.startsWith("news-");
            const kelolaHref = manageHref(item, topics);
            return (
              <Card key={item.id}>
                <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="neutral">{item.topicLabel}</Badge>
                      {isNews ? (
                        <Badge variant={item.newsStatus === "published" ? "success" : "neutral"}>
                          {item.newsStatus === "published" ? "Published" : "Draft"}
                        </Badge>
                      ) : null}
                      {item.is_featured ? <Badge variant="primary">Unggulan</Badge> : null}
                      {item.is_popular ? <Badge variant="primary">Populer</Badge> : null}
                    </div>
                    <p className="mt-1 truncate font-medium">{item.title}</p>
                    <p className="text-sm text-muted-foreground">{item.dateLabel ?? "Belum dipublikasikan"}</p>
                  </div>
                  <div className="flex shrink-0 flex-wrap gap-2">
                    {!isNews || item.newsStatus === "published" ? (
                      <Button variant="ghost" size="sm" asChild>
                        <Link href={item.href} target="_blank">
                          <ExternalLink />
                          Lihat
                        </Link>
                      </Button>
                    ) : null}

                    {isNews ? (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={busyId === item.id}
                          onClick={() => toggleNewsStatus(item)}
                        >
                          {item.newsStatus === "published" ? "Jadikan Draft" : "Publikasikan"}
                        </Button>
                        <NewsFormDialog
                          editing={{
                            id: item.id.replace(/^news-/, ""),
                            slug: item.href.replace("/berita/", ""),
                            title: item.title,
                            excerpt: item.summary,
                            // newsContent SELALU terisi di sini karena
                            // ContentAggregatorList selalu memanggil
                            // fetchUnifiedContent dengan
                            // includeAllNewsStatuses: true (lihat di atas) -
                            // fallback "" hanya jaring pengaman tipe, bukan
                            // jalur yang benar-benar diharapkan terpakai.
                            content: item.newsContent ?? "",
                            topic_id: topics.find((t) => t.key === item.topicKey)?.id ?? null,
                            author_name: item.newsAuthorName ?? null,
                            thumbnail_url: item.image_url,
                            is_featured: item.is_featured,
                            is_popular: item.is_popular,
                            status: item.newsStatus ?? "draft",
                          }}
                          topics={topics}
                          trigger={
                            <Button variant="outline" size="sm" disabled={busyId === item.id}>
                              <Pencil />
                              Edit
                            </Button>
                          }
                        />
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="destructive" size="sm" disabled={busyId === item.id}>
                              <Trash2 />
                              Hapus Permanen
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>
                                Hapus permanen &quot;{item.title}&quot;?
                              </AlertDialogTitle>
                              <AlertDialogDescription>
                                Apakah Anda yakin ingin menghapus permanen berita ini?
                                Tindakan ini tidak dapat dibatalkan - berita akan
                                hilang dari Admin, halaman publik, dan Hero Carousel
                                (jika sedang Unggulan).
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Batal</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDeleteNews(item)}>
                                Ya, Hapus Permanen
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </>
                    ) : kelolaHref ? (
                      <Button variant="outline" size="sm" asChild>
                        <Link href={kelolaHref}>
                          <FolderOpen />
                          Kelola
                        </Link>
                      </Button>
                    ) : null}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {!isLoading && !error && total > 0 && (
        <div className="flex items-center justify-between text-sm">
          <p className="text-muted-foreground">
            Halaman {page + 1} dari {totalPages} ({total} konten)
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page === 0}
              onClick={() => setPage((p) => Math.max(0, p - 1))}
            >
              Sebelumnya
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page + 1 >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Berikutnya
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
