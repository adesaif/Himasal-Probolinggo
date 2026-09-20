"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, ExternalLink, Search } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
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
import { formatDateID } from "@/lib/format-date";

type NewsRow = {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  content: string;
  category: string | null;
  category_id: string | null;
  author_name: string | null;
  thumbnail_url: string | null;
  is_featured: boolean;
  status: string;
  published_at: string | null;
  created_at: string;
};

type CategoryOption = { id: string; name: string; slug: string };

const PAGE_SIZE = 10;
const ALL_VALUE = "__all__";

export function NewsList({
  categories,
  initialCategorySlug,
  featuredAllowed,
}: {
  categories: CategoryOption[];
  initialCategorySlug?: string;
  featuredAllowed: boolean;
}) {
  const initialCategoryId =
    categories.find((c) => c.slug === initialCategorySlug)?.id ?? ALL_VALUE;

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 350);
  const [statusFilter, setStatusFilter] = useState(ALL_VALUE);
  const [categoryFilter, setCategoryFilter] = useState(initialCategoryId);
  const [page, setPage] = useState(0);
  const categoryById = new Map(categories.map((c) => [c.id, c]));

  const [rows, setRows] = useState<NewsRow[]>([]);
  const [count, setCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const filterKey = `${debouncedSearch}|${statusFilter}|${categoryFilter}`;
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

      let query = supabase
        .from("news")
        .select(
          "id, slug, title, excerpt, content, category, category_id, author_name, thumbnail_url, is_featured, status, published_at, created_at",
          { count: "exact" },
        );

      if (debouncedSearch.trim()) {
        query = query.ilike("title", `%${debouncedSearch.trim()}%`);
      }
      if (statusFilter !== ALL_VALUE) {
        query = query.eq("status", statusFilter);
      }
      if (categoryFilter !== ALL_VALUE) {
        query = query.eq("category_id", categoryFilter);
      }

      const from = page * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      const { data, error, count } = await query
        .order("created_at", { ascending: false })
        .range(from, to);

      if (cancelled) return;

      if (error) {
        setError(error.message);
        setRows([]);
        setCount(0);
      } else {
        setRows(data ?? []);
        setCount(count ?? 0);
      }
      setIsLoading(false);
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [debouncedSearch, statusFilter, categoryFilter, page, reloadKey]);

  const totalPages = Math.max(1, Math.ceil(count / PAGE_SIZE));

  async function handleDelete(id: string) {
    setBusyId(id);
    const supabase = createClient();
    const { error } = await supabase.from("news").delete().eq("id", id);
    setBusyId(null);

    if (error) {
      toast.error("Gagal menghapus berita", { description: error.message });
      return;
    }
    toast.success("Berita berhasil dihapus");
    setReloadKey((k) => k + 1);
  }

  async function toggleStatus(row: NewsRow) {
    setBusyId(row.id);
    const nextStatus = row.status === "published" ? "draft" : "published";
    const supabase = createClient();
    const { error } = await supabase
      .from("news")
      .update({
        status: nextStatus,
        published_at: nextStatus === "published" ? new Date().toISOString() : row.published_at,
      })
      .eq("id", row.id);
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
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Berita</h1>
        <NewsFormDialog
          categories={categories}
          featuredAllowed={featuredAllowed}
          trigger={
            <Button>
              <Plus />
              Tambah Berita
            </Button>
          }
        />
      </div>

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
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Semua kategori" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_VALUE}>Semua kategori</SelectItem>
            {categories.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
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
      ) : rows.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            Tidak ada berita yang cocok.
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-2">
          {rows.map((row) => (
            <Card key={row.id}>
              <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={
                        row.status === "published"
                          ? "rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800 dark:bg-green-900/40 dark:text-green-300"
                          : "rounded-full bg-neutral-100 px-2.5 py-0.5 text-xs font-medium text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300"
                      }
                    >
                      {row.status === "published" ? "Published" : "Draft"}
                    </span>
                    {row.is_featured ? (
                      <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                        Unggulan
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-1 truncate font-medium">{row.title}</p>
                  <p className="text-sm text-muted-foreground">
                    {formatDateID(row.created_at)}
                    {row.category_id && categoryById.get(row.category_id)
                      ? ` · ${categoryById.get(row.category_id)!.name}`
                      : row.category
                        ? ` · ${row.category}`
                        : ""}
                  </p>
                </div>
                <div className="flex shrink-0 flex-wrap gap-2">
                  {row.status === "published" ? (
                    <Button variant="ghost" size="sm" asChild>
                      <Link href={`/berita/${row.slug}`} target="_blank">
                        <ExternalLink />
                        Lihat
                      </Link>
                    </Button>
                  ) : null}
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={busyId === row.id}
                    onClick={() => toggleStatus(row)}
                  >
                    {row.status === "published" ? "Jadikan Draft" : "Publikasikan"}
                  </Button>
                  <NewsFormDialog
                    editing={row}
                    categories={categories}
                    featuredAllowed={featuredAllowed}
                    trigger={
                      <Button variant="outline" size="sm" disabled={busyId === row.id}>
                        <Pencil />
                        Edit
                      </Button>
                    }
                  />
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" size="sm" disabled={busyId === row.id}>
                        <Trash2 />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Hapus berita ini?</AlertDialogTitle>
                        <AlertDialogDescription>
                          &quot;{row.title}&quot; akan dihapus permanen dan tidak bisa
                          dikembalikan.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Batal</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleDelete(row.id)}>
                          Ya, hapus
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {!isLoading && !error && count > 0 && (
        <div className="flex items-center justify-between text-sm">
          <p className="text-muted-foreground">
            Halaman {page + 1} dari {totalPages} ({count} berita)
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
