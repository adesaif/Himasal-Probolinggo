"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { cn } from "@/lib/utils";

export type HeroSlide = {
  id: string;
  href: string;
  title: string;
  thumbnail_url: string;
};

const AUTOPLAY_MS = 3000;
const TRANSITION_MS = 700;

/**
 * Hero portal konten: setiap slide adalah konten Unggulan (is_featured,
 * published, punya thumbnail) dari topik yang mengizinkan Unggulan
 * (site_topics.allow_featured) - saat ini Berita dan/atau Agenda, diambil
 * langsung dari CMS Admin, judul TIDAK pernah di-hardcode. Jika belum ada
 * konten unggulan, komponen ini return null dan hero memakai background
 * gradient premium (.hero-premium-bg) sebagai fallback.
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

  const active = slides[index];

  return (
    <div
      className="absolute inset-0 overflow-hidden"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {slides.map((slide, i) => (
        <div
          key={slide.id}
          className={cn(
            "absolute inset-0 transition-opacity ease-in-out",
            i === index ? "opacity-100" : "opacity-0",
          )}
          style={{ transitionDuration: `${TRANSITION_MS}ms` }}
        >
          {/* Backdrop dari foto yang sama, di-blur+digelapkan sampai jadi
              ambient glow (bukan foto kedua yang bisa dikenali) - mengisi
              seluruh Hero jadi satu canvas atmospheric yang membungkus
              foto utama. Scale + blur besar supaya tidak ada tepi tajam
              yang terlihat seperti panel terpisah. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={slide.thumbnail_url}
            alt=""
            aria-hidden="true"
            className="absolute inset-0 size-full scale-125 object-cover blur-3xl brightness-[0.55] saturate-125"
          />
          {/* Foto utama: dibungkus flex-center supaya kotak gambar persis
              sebesar foto yang tampil (mengikuti rasio asli), bukan kotak
              selebar Hero dengan object-contain "melayang" di tengahnya -
              pendekatan lama itu rapuh: untuk foto produksi yang framing
              aslinya sudah landscape/lebar dengan subjek tidak persis di
              tengah bingkai, kotak selebar Hero membuat foto terlihat
              nempel ke satu sisi dengan ambient glow di sisi lain terasa
              seperti blok kedua yang terpisah - bukan satu composition.
              Dengan flex items-center justify-center + max-h-full
              max-w-full, foto (dan bingkainya: rounded, shadow, ring)
              selalu presisi di tengah Hero apa pun rasio & komposisi foto
              sumbernya, jadi ambient glow di kedua sisi simetris dan
              terasa membungkus foto, bukan kosong sebelah. Tidak pernah
              crop (object-contain + max-h/max-w, tanpa fixed width). */}
          <div className="absolute inset-3 flex items-center justify-center sm:inset-6 lg:inset-8">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={slide.thumbnail_url}
              alt={slide.title}
              className="max-h-full max-w-full rounded-2xl object-contain shadow-2xl ring-1 ring-white/10"
            />
          </div>
        </div>
      ))}
      <div className="hero-slide-overlay absolute inset-0" aria-hidden="true" />

      <div className="absolute inset-x-0 bottom-0 z-10 px-4 pb-14 sm:px-12 sm:pb-16">
        <Link
          href={active.href}
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
