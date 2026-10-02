"use client";

import { useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export const MIN_ANGKATAN = 1800;
const PAGE_SIZE = 12;
// Halaman masa depan tetap bisa dilihat (tahun tampil tapi disabled),
// dibatasi beberapa halaman saja supaya navigasi tidak tanpa ujung.
const FUTURE_PAGES = 2;

/** Batas atas yang boleh dipilih = tahun berjalan (dinamis, bukan 2026). */
export function currentYear() {
  return new Date().getFullYear();
}

function pageStartFor(year: number) {
  return MIN_ANGKATAN + Math.floor((year - MIN_ANGKATAN) / PAGE_SIZE) * PAGE_SIZE;
}

/**
 * Pemilih tahun Angkatan gaya kalender: grid 12 tahun per halaman,
 * navigasi sebelumnya/berikutnya, dan kolom "ketik tahun" untuk lompat
 * cepat (mis. 1950 tanpa belasan klik). Rentang 1800 s.d. tahun berjalan
 * bisa dipilih; tahun setelahnya tetap tampil tapi disabled.
 */
export function AlumniYearPicker({
  value,
  onChange,
  disabled,
  invalid,
  id,
  "aria-invalid": ariaInvalid,
  "aria-describedby": ariaDescribedBy,
}: {
  value: number | null;
  onChange: (value: number | null) => void;
  disabled?: boolean;
  invalid?: boolean;
  id?: string;
  // Diteruskan oleh FormControl (Slot) supaya label & pesan error tetap
  // terhubung ke tombol pemicu.
  "aria-invalid"?: boolean | "true" | "false";
  "aria-describedby"?: string;
}) {
  const maxYear = currentYear();
  const [open, setOpen] = useState(false);
  const [pageStart, setPageStart] = useState(() => pageStartFor(value ?? maxYear));
  const [typed, setTyped] = useState("");

  const lastPageStart = pageStartFor(maxYear) + FUTURE_PAGES * PAGE_SIZE;
  const years = Array.from({ length: PAGE_SIZE }, (_, i) => pageStart + i);

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (next) {
      setPageStart(pageStartFor(value ?? maxYear));
      setTyped("");
    }
  }

  function choose(year: number) {
    onChange(year);
    setOpen(false);
  }

  const typedYear = /^\d{4}$/.test(typed) ? Number(typed) : null;
  const typedValid = typedYear !== null && typedYear >= MIN_ANGKATAN && typedYear <= maxYear;

  return (
    <Popover open={open} onOpenChange={handleOpenChange} modal>
      <PopoverTrigger asChild>
        <button
          id={id}
          type="button"
          data-invalid={invalid || ariaInvalid === true || ariaInvalid === "true" || undefined}
          aria-describedby={ariaDescribedBy}
          disabled={disabled}
          className="border-input focus-visible:border-ring focus-visible:ring-ring/50 data-[invalid=true]:ring-destructive/20 data-[invalid=true]:border-destructive dark:bg-input/30 dark:hover:bg-input/50 flex h-9 w-full min-w-0 items-center justify-between gap-2 rounded-md border bg-transparent px-3 py-2 text-left text-sm shadow-xs transition-[color,box-shadow] outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50"
        >
          <span className={cn(value === null && "text-muted-foreground")}>
            {value ?? "Pilih tahun"}
          </span>
          <CalendarDays className="size-4 shrink-0 opacity-50" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-3">
        <div className="flex items-center justify-between gap-2">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Tahun sebelumnya"
            disabled={pageStart <= MIN_ANGKATAN}
            onClick={() => setPageStart((p) => Math.max(MIN_ANGKATAN, p - PAGE_SIZE))}
          >
            <ChevronLeft />
          </Button>
          <p className="text-sm font-medium">
            {years[0]} – {years[years.length - 1]}
          </p>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Tahun berikutnya"
            disabled={pageStart >= lastPageStart}
            onClick={() => setPageStart((p) => Math.min(lastPageStart, p + PAGE_SIZE))}
          >
            <ChevronRight />
          </Button>
        </div>

        <div className="mt-2 grid grid-cols-4 gap-1.5" role="grid">
          {years.map((year) => {
            const isFuture = year > maxYear;
            const isSelected = year === value;
            return (
              <button
                key={year}
                type="button"
                disabled={isFuture}
                aria-pressed={isSelected}
                title={isFuture ? "Belum dapat dipilih" : undefined}
                onClick={() => choose(year)}
                className={cn(
                  "h-10 rounded-md text-sm transition-colors outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
                  isSelected
                    ? "bg-primary font-semibold text-primary-foreground"
                    : "hover:bg-accent hover:text-accent-foreground",
                  year === maxYear && !isSelected && "border border-primary/40",
                  isFuture &&
                    "cursor-not-allowed text-muted-foreground/50 line-through decoration-muted-foreground/30 hover:bg-transparent hover:text-muted-foreground/50",
                )}
              >
                {year}
              </button>
            );
          })}
        </div>

        <div className="mt-3 flex items-center gap-2 border-t pt-3">
          <input
            type="text"
            inputMode="numeric"
            maxLength={4}
            value={typed}
            onChange={(e) => {
              const next = e.target.value.replace(/\D/g, "");
              setTyped(next);
              if (/^\d{4}$/.test(next)) {
                const y = Number(next);
                if (y >= MIN_ANGKATAN) setPageStart(pageStartFor(Math.min(y, lastPageStart)));
              }
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                if (typedValid && typedYear !== null) choose(typedYear);
              }
            }}
            placeholder="Ketik tahun"
            aria-label="Ketik tahun angkatan"
            className="border-input h-9 w-full min-w-0 rounded-md border bg-transparent px-3 text-base outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 sm:text-sm dark:bg-input/30"
          />
          <Button
            type="button"
            size="sm"
            disabled={!typedValid}
            onClick={() => typedYear !== null && choose(typedYear)}
          >
            Pilih
          </Button>
        </div>
        {typed.length === 4 && !typedValid ? (
          <p className="mt-1.5 text-xs text-destructive">
            Tahun harus antara {MIN_ANGKATAN} dan {maxYear}.
          </p>
        ) : null}

        {value !== null ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="mt-2 w-full text-muted-foreground"
            onClick={() => {
              onChange(null);
              setOpen(false);
            }}
          >
            Kosongkan
          </Button>
        ) : null}
      </PopoverContent>
    </Popover>
  );
}
