"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { cn } from "@/lib/utils";

export type HeroSlide = { id: string; image_url: string; alt_text: string };

const AUTOPLAY_MS = 7000;
const TRANSITION_MS = 700;

/**
 * Menampilkan wallpaper hero yang dikelola Admin lewat
 * /admin/konten/hero (tabel hero_slides, hanya yang is_active=true).
 * Jika belum ada wallpaper aktif, komponen ini sengaja return null -
 * hero tetap memakai background gradient premium (.hero-premium-bg).
 */
export function HeroCarousel({ slides }: { slides: HeroSlide[] }) {
  const [index, setIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const goTo = useCallback(
    (next: number) => {
      setIndex(((next % slides.length) + slides.length) % slides.length);
    },
    [slides.length],
  );

  useEffect(() => {
    if (slides.length <= 1 || isPaused) return;
    if (
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      return;
    }
    timerRef.current = setInterval(() => {
      setIndex((i) => (i + 1) % slides.length);
    }, AUTOPLAY_MS);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPaused, slides.length]);

  if (slides.length === 0) {
    return null;
  }

  return (
    <div
      className="absolute inset-0 -z-10 overflow-hidden"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {slides.map((slide, i) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={slide.id}
          src={slide.image_url}
          alt={slide.alt_text}
          className={cn(
            "absolute inset-0 size-full object-cover transition-opacity ease-in-out",
            i === index ? "opacity-100" : "opacity-0",
          )}
          style={{ transitionDuration: `${TRANSITION_MS}ms` }}
        />
      ))}
      <div className="hero-slide-overlay absolute inset-0" aria-hidden="true" />

      {slides.length > 1 ? (
        <>
          <button
            type="button"
            onClick={() => {
              setIsPaused(true);
              goTo(index - 1);
            }}
            aria-label="Foto sebelumnya"
            className="absolute top-1/2 left-3 -translate-y-1/2 rounded-full bg-black/30 p-2 text-white transition-colors hover:bg-black/50"
          >
            <ChevronLeft className="size-5" />
          </button>
          <button
            type="button"
            onClick={() => {
              setIsPaused(true);
              goTo(index + 1);
            }}
            aria-label="Foto berikutnya"
            className="absolute top-1/2 right-3 -translate-y-1/2 rounded-full bg-black/30 p-2 text-white transition-colors hover:bg-black/50"
          >
            <ChevronRight className="size-5" />
          </button>
          <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-2">
            {slides.map((slide, i) => (
              <button
                key={slide.id}
                type="button"
                onClick={() => {
                  setIsPaused(true);
                  goTo(i);
                }}
                aria-label={`Ke foto ${i + 1}`}
                aria-current={i === index ? "true" : undefined}
                className={cn(
                  "h-1.5 rounded-full transition-all",
                  i === index ? "w-6 bg-white" : "w-1.5 bg-white/40",
                )}
              />
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}
