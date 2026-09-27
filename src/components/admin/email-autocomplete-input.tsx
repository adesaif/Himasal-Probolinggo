"use client";

import { forwardRef, useId, useState } from "react";

import { Input } from "@/components/ui/input";
import { getEmailSuggestions } from "@/lib/email-suggest";
import { cn } from "@/lib/utils";

/**
 * Input email dengan saran domain (Gmail, Yahoo, Outlook, Hotmail, iCloud).
 * Saran hanya muncul sebagai pilihan - nilai field baru berubah kalau user
 * memilih (klik/tap, atau panah + Enter/Tab). Email lengkap dengan domain
 * lain tetap diterima apa adanya.
 *
 * Pola ARIA combobox (input + listbox) supaya ramah keyboard & screen
 * reader. Daftar dirender di bawah input (bukan portal) sehingga ikut
 * scroll di dalam dialog pada layar kecil.
 */
export const EmailAutocompleteInput = forwardRef<
  HTMLInputElement,
  Omit<React.ComponentProps<"input">, "value" | "onChange"> & {
    value: string;
    onChange: (value: string) => void;
  }
>(function EmailAutocompleteInput({ value, onChange, onBlur, onKeyDown, className, ...props }, ref) {
  const listId = useId();
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  const suggestions = open ? getEmailSuggestions(value) : [];
  const expanded = suggestions.length > 0;

  function choose(next: string) {
    onChange(next);
    setOpen(false);
    setActiveIndex(-1);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    // Esc ditangani lebih dulu: Dialog induk sudah memanggil preventDefault
    // (supaya form tidak tertutup) sebelum event sampai ke sini.
    if (e.key === "Escape" && expanded) {
      e.preventDefault();
      setOpen(false);
      setActiveIndex(-1);
      return;
    }

    onKeyDown?.(e);
    if (e.defaultPrevented) return;

    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      const list = getEmailSuggestions(value);
      if (list.length === 0) return;
      e.preventDefault();
      setOpen(true);
      const delta = e.key === "ArrowDown" ? 1 : -1;
      setActiveIndex((i) => (i + delta + list.length) % list.length);
      return;
    }
    if (!expanded) return;

    if ((e.key === "Enter" || e.key === "Tab") && activeIndex >= 0) {
      // Enter/Tab hanya memilih kalau user sudah menyorot saran - tanpa
      // sorotan, Enter tetap submit form seperti biasa.
      if (e.key === "Enter") e.preventDefault();
      choose(suggestions[activeIndex].value);
    }
  }

  return (
    <div className="relative">
      <Input
        ref={ref}
        type="email"
        inputMode="email"
        autoComplete="off"
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={expanded}
        aria-controls={listId}
        aria-activedescendant={expanded && activeIndex >= 0 ? `${listId}-${activeIndex}` : undefined}
        data-email-autocomplete={expanded ? "open" : "closed"}
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
          setActiveIndex(-1);
        }}
        onFocus={() => setOpen(true)}
        onBlur={(e) => {
          setOpen(false);
          setActiveIndex(-1);
          onBlur?.(e);
        }}
        onKeyDown={handleKeyDown}
        className={className}
        {...props}
      />
      {expanded ? (
        <ul
          id={listId}
          role="listbox"
          aria-label="Saran alamat email"
          className="absolute top-full right-0 left-0 z-50 mt-1 max-h-64 overflow-y-auto rounded-md border bg-popover p-1 text-popover-foreground shadow-md"
        >
          {suggestions.map((s, index) => {
            const at = s.value.lastIndexOf("@");
            return (
              <li
                key={s.value}
                id={`${listId}-${index}`}
                role="option"
                aria-selected={index === activeIndex}
                // mousedown (bukan click) dicegah supaya input tidak blur
                // sebelum pilihan tercatat - berlaku juga untuk tap di HP.
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => choose(s.value)}
                onMouseMove={() => setActiveIndex(index)}
                className={cn(
                  "flex min-h-10 cursor-pointer items-center justify-between gap-2 rounded-sm px-2 py-2 text-sm",
                  index === activeIndex && "bg-accent text-accent-foreground",
                )}
              >
                <span className="min-w-0 truncate">
                  {s.isTypoFix ? (
                    <span className="text-muted-foreground">Maksud Anda: </span>
                  ) : null}
                  <span>{s.value.slice(0, at)}</span>
                  <span className="font-semibold">{s.value.slice(at)}</span>
                </span>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
});
