"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Search } from "lucide-react";

import { Input } from "@/components/ui/input";
import { useDebouncedValue } from "@/hooks/use-debounced-value";

export function BeritaSearchInput() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [value, setValue] = useState(searchParams.get("q") ?? "");
  const debounced = useDebouncedValue(value, 400);

  useEffect(() => {
    const current = searchParams.get("q") ?? "";
    if (debounced === current) return;

    const params = new URLSearchParams(searchParams.toString());
    if (debounced) {
      params.set("q", debounced);
    } else {
      params.delete("q");
    }
    params.delete("page");

    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced]);

  return (
    <div className="relative">
      <Search className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        placeholder="Cari berita..."
        className="pl-8"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        aria-label="Cari berita"
      />
    </div>
  );
}
