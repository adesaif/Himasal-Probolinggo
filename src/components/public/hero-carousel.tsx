"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { cn } from "@/lib/utils";

export type HeroNewsSlide = {
  id: string;
  slug: string;
  title: string;
  thumbnail_url: string;
};

const AUTOPLAY_MS = 3000;
const TRANSITION_MS = 700;

/**
 * Hero portal berita: setiap slide adalah berita Unggulan (is_featured,
 * published, punya thumbnail) yang diambil langsung dari CMS Admin
 * (/admin/berita) - judul TIDAK pernah di-hardcode. Jika belum ada
 * berita unggulan, komponen ini return null dan hero memakai background
 * gradient premium (.hero-premium-bg) sebagai fallback.
 */
export function HeroCarousel({ slides }: { slides: HeroNewsSlide[] }) {
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

  const active = slides[index];

  return (
    <div
      className="absolute inset-0 overflow-hidden"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {slides.map((slide, i) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={slide.id}
          src={slide.thumbnail_url}
          alt={slide.title}
          className={cn(
            "absolute inset-0 size-full object-cover transition-opacity ease-in-out",
            i === index ? "opacity-100" : "opacity-0",
          )}
          style={{ transitionDuration: `${TRANSITION_MS}ms` }}
        />
      ))}
      <div className="hero-slide-overlay absolute inset-0" aria-hidden="true" />

      <div className="absolute inset-x-0 bottom-0 z-10 px-4 pb-14 sm:px-12 sm:pb-16">
        <Link
          href={`/berita/${active.slug}`}
          className="mx-auto block max-w-3xl text-center text-xl leading-tight font-bold text-balance text-white transition-opacity hover:opacity-90 sm:text-3xl"
        >
          {active.title}
        </Link>
      </div>

      {slides.length > 1 ? (
        <>
          <button
            type="button"
            onClick={() => {
              setIsPaused(true);
              goTo(index - 1);
            }}
            aria-label="Berita sebelumnya"
            className="absolute top-1/2 left-3 z-10 -translate-y-1/2 rounded-full bg-black/30 p-2 text-white transition-colors hover:bg-black/50"
          >
            <ChevronLeft className="size-5" />
          </button>
          <button
            type="button"
            onClick={() => {
              setIsPaused(true);
              goTo(index + 1);
            }}
            aria-label="Berita berikutnya"
            className="absolute top-1/2 right-3 z-10 -translate-y-1/2 rounded-full bg-black/30 p-2 text-white transition-colors hover:bg-black/50"
          >
            <ChevronRight className="size-5" />
          </button>
          <div className="absolute bottom-4 left-1/2 z-10 flex -translate-x-1/2 gap-2">
            {slides.map((slide, i) => (
              <button
                key={slide.id}
                type="button"
                onClick={() => {
                  setIsPaused(true);
                  goTo(i);
                }}
                aria-label={`Ke berita ${i + 1}`}
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
