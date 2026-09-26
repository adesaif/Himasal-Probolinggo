"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Search, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/**
 * Search header - memakai infrastruktur pencarian /berita?q= yang sudah
 * ada (lihat src/app/(public)/berita/page.tsx dan berita-search-input.tsx),
 * bukan sistem search baru.
 */
export function HeaderSearch({ className }: { className?: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  function submit(e: FormEvent) {
    e.preventDefault();
    const q = value.trim();
    router.push(q ? `/berita?q=${encodeURIComponent(q)}` : "/berita");
    setOpen(false);
    setValue("");
  }

  if (open) {
    return (
      <form onSubmit={submit} className="flex items-center gap-1">
        <Input
          ref={inputRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onBlur={() => {
            if (!value) setOpen(false);
          }}
          placeholder="Cari berita..."
          className="h-9 w-32 sm:w-48"
          aria-label="Cari berita"
        />
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={cn(className)}
          onClick={() => {
            setOpen(false);
            setValue("");
          }}
          aria-label="Tutup pencarian"
        >
          <X className="size-4" />
        </Button>
      </form>
    );
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className={cn(className)}
      onClick={() => setOpen(true)}
      aria-label="Cari berita"
    >
      <Search className="size-4" />
    </Button>
  );
}
