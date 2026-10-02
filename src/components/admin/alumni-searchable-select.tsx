"use client";

import { useId, useMemo, useRef, useState } from "react";
import { CheckIcon, ChevronDownIcon, Search } from "lucide-react";

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export type SearchableOption = {
  value: string;
  label: string;
  /** Judul kelompok (mis. "Desa" / "Kelurahan"); opsi berurutan dengan
   *  group yang sama ditampilkan di bawah satu judul. */
  group?: string;
};

type Item = SearchableOption & { isAll?: boolean };

// "Karang Anyar" cocok dengan "karanganyar", "opo opo" dengan "Opo-Opo".
function normalize(text: string) {
  return text.toLowerCase().replace(/[^a-z0-9]/g, "");
}

/**
 * Selector dengan kolom pencarian di bagian paling atas daftar - dipakai
 * modul Admin -> Alumni untuk Kecamatan dan Desa/Kelurahan (filter maupun
 * form). Dua cara memilih: klik langsung dari daftar, atau ketik untuk
 * menyaring lalu klik/Enter.
 *
 * `modal` pada Popover sengaja aktif: tanpa itu, daftar yang dibuka dari
 * dalam Dialog (form Tambah/Edit) tidak bisa di-scroll karena scroll-lock
 * milik Dialog.
 */
export function AlumniSearchableSelect({
  value,
  onChange,
  options,
  placeholder,
  searchPlaceholder,
  emptyText = "Tidak ada hasil.",
  allOptionLabel,
  disabled,
  invalid,
  className,
  id,
  "aria-invalid": ariaInvalid,
  "aria-describedby": ariaDescribedBy,
}: {
  value: string | null;
  onChange: (value: string | null) => void;
  options: SearchableOption[];
  placeholder: string;
  searchPlaceholder: string;
  emptyText?: string;
  /** Kalau diisi, opsi "semua" (value null) ditampilkan di paling atas. */
  allOptionLabel?: string;
  disabled?: boolean;
  invalid?: boolean;
  className?: string;
  id?: string;
  // Diteruskan oleh FormControl (Slot) supaya label & pesan error tetap
  // terhubung ke tombol pemicu.
  "aria-invalid"?: boolean | "true" | "false";
  "aria-describedby"?: string;
}) {
  const listId = useId();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);

  const selected = options.find((o) => o.value === value) ?? null;

  const items = useMemo<Item[]>(() => {
    const q = normalize(query);
    const filtered = q ? options.filter((o) => normalize(o.label).includes(q)) : options;
    const all: Item[] =
      allOptionLabel && !q ? [{ value: "", label: allOptionLabel, isAll: true }] : [];
    return [...all, ...filtered];
  }, [options, query, allOptionLabel]);

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (next) {
      setQuery("");
      // Indeks dihitung terhadap daftar tanpa pencarian (query baru saja
      // dikosongkan), supaya item terpilih langsung tersorot.
      const values = [...(allOptionLabel ? [null] : []), ...options.map((o) => o.value)];
      setActiveIndex(Math.max(0, values.indexOf(value)));
    }
  }

  function choose(option: Item) {
    onChange(option.isAll ? null : option.value);
    setOpen(false);
  }

  function scrollToIndex(index: number) {
    const el = listRef.current?.querySelector<HTMLElement>(`[data-index="${index}"]`);
    el?.scrollIntoView({ block: "nearest" });
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      if (items.length === 0) return;
      const delta = e.key === "ArrowDown" ? 1 : -1;
      const next = (activeIndex + delta + items.length) % items.length;
      setActiveIndex(next);
      scrollToIndex(next);
    } else if (e.key === "Enter") {
      e.preventDefault();
      const option = items[activeIndex];
      if (option) choose(option);
    }
  }

  return (
    <Popover open={open} onOpenChange={handleOpenChange} modal>
      <PopoverTrigger asChild>
        <button
          id={id}
          type="button"
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-invalid={invalid || ariaInvalid === true || ariaInvalid === "true" || undefined}
          aria-describedby={ariaDescribedBy}
          disabled={disabled}
          className={cn(
            "border-input focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 aria-invalid:border-destructive dark:bg-input/30 dark:hover:bg-input/50 flex h-9 w-full min-w-0 items-center justify-between gap-2 rounded-md border bg-transparent px-3 py-2 text-left text-sm shadow-xs transition-[color,box-shadow] outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50",
            className,
          )}
        >
          <span className={cn("truncate", !selected && "text-muted-foreground")}>
            {selected ? selected.label : placeholder}
          </span>
          <ChevronDownIcon className="size-4 shrink-0 opacity-50" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="w-(--radix-popover-trigger-width) min-w-[14rem]"
        onOpenAutoFocus={(e) => {
          // Fokus ke kolom pencarian, bukan ke item pertama.
          e.preventDefault();
          (e.currentTarget as HTMLElement).querySelector("input")?.focus();
        }}
      >
        <div className="flex items-center gap-2 border-b px-3">
          <Search className="size-4 shrink-0 text-muted-foreground" />
          <input
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActiveIndex(0);
            }}
            onKeyDown={handleKeyDown}
            placeholder={searchPlaceholder}
            aria-label={searchPlaceholder}
            aria-controls={listId}
            className="h-10 w-full min-w-0 bg-transparent text-base outline-none placeholder:text-muted-foreground sm:text-sm"
          />
        </div>
        <div
          ref={listRef}
          id={listId}
          role="listbox"
          className="max-h-[min(18rem,var(--radix-popover-content-available-height))] overflow-y-auto overscroll-contain p-1"
        >
          {items.length === 0 ? (
            <p className="px-2 py-6 text-center text-sm text-muted-foreground">{emptyText}</p>
          ) : (
            items.map((option, index) => {
              const isSelected = (option.value || null) === value;
              const prev = items[index - 1];
              const showGroup =
                !option.isAll && option.group && (!prev || prev.isAll || prev.group !== option.group);
              return (
                <div key={option.isAll ? "__all__" : option.value}>
                  {showGroup ? (
                    <p className="px-2 pt-2 pb-1 text-xs font-medium text-muted-foreground">
                      {option.group}
                    </p>
                  ) : null}
                  <button
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    data-index={index}
                    onClick={() => choose(option)}
                    onMouseMove={() => setActiveIndex(index)}
                    className={cn(
                      "flex w-full items-center justify-between gap-2 rounded-sm px-2 py-2 text-left text-sm outline-none sm:py-1.5",
                      index === activeIndex && "bg-accent text-accent-foreground",
                      option.isAll && "text-muted-foreground",
                    )}
                  >
                    <span className="truncate">{option.label}</span>
                    {isSelected ? <CheckIcon className="size-4 shrink-0" /> : null}
                  </button>
                </div>
              );
            })
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
