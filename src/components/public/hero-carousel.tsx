"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  AnimatePresence,
  motion,
  useMotionValue,
  useReducedMotion,
  useSpring,
} from "framer-motion";

import { cn } from "@/lib/utils";

export type HeroSlide = {
  id: string;
  href: string;
  title: string;
  thumbnail_url: string;
  // Ketiganya opsional dan HANYA tampil kalau datanya memang ada di CMS -
  // tidak pernah di-fallback ke teks buatan. category: label topik sumber
  // konten (atau news.category kalau ada) - lihat homepage-content.ts.
  category?: string | null;
  summary?: string | null;
  date?: string | null;
};

const AUTOPLAY_MS = 3000;

// Spring dipakai untuk crossfade+morph antar slide (bahasa motion diambil
// dari referensi scroll-morph: pergerakan spring yang halus, bukan linear
// ease) - redup/lembut karena ini Hero utama, bukan elemen dekoratif.
const SLIDE_SPRING = { type: "spring" as const, stiffness: 120, damping: 22, mass: 1 };
const TEXT_SPRING = { type: "spring" as const, stiffness: 160, damping: 20 };

// Parallax sangat halus mengikuti kursor - hanya elemen foto utama yang
// bergerak (backdrop tetap diam supaya tidak terasa "goyang"), dan cuma
// aktif di desktop (mousemove tidak pernah terpicu di touch, jadi mobile
// otomatis diam tanpa perlu deteksi device terpisah).
const PARALLAX_RANGE = 14;

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
  const prefersReducedMotion = useReducedMotion();

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

  // Parallax kursor - offset kecil untuk foto utama saja.
  const parallaxX = useMotionValue(0);
  const parallaxY = useMotionValue(0);
  const springParallaxX = useSpring(parallaxX, { stiffness: 60, damping: 20 });
  const springParallaxY = useSpring(parallaxY, { stiffness: 60, damping: 20 });

  function handleMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    if (prefersReducedMotion) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const relX = (e.clientX - rect.left) / rect.width - 0.5;
    const relY = (e.clientY - rect.top) / rect.height - 0.5;
    parallaxX.set(relX * PARALLAX_RANGE);
    parallaxY.set(relY * PARALLAX_RANGE);
  }

  function resetParallax() {
    parallaxX.set(0);
    parallaxY.set(0);
  }

  if (slides.length === 0) {
    return null;
  }

  const active = slides[index];

  return (
    <div
      className="absolute inset-0 overflow-hidden"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => {
        setIsPaused(false);
        resetParallax();
      }}
      onMouseMove={handleMouseMove}
    >
      {slides.map((slide, i) => {
        const isActive = i === index;
        return (
          <motion.div
            key={slide.id}
            className="absolute inset-0"
            initial={false}
            animate={{ opacity: isActive ? 1 : 0, scale: isActive ? 1 : 1.04 }}
            transition={prefersReducedMotion ? { duration: 0 } : SLIDE_SPRING}
            style={{ pointerEvents: isActive ? "auto" : "none" }}
          >
            {/* Strategi image-fit: object-cover PERNAH dipakai di sini dan
                selalu berisiko memotong wajah/kepala pada foto produksi -
                tidak bisa diterima untuk foto berita. Foto utama harus
                selalu utuh (object-contain, tidak pernah di-crop di sisi
                mana pun), jadi dipisah dua lapis:
                1) backdrop - foto yang sama, di-blur+digelapkan, object-
                   cover (backdrop BOLEH ter-crop karena cuma ambient glow
                   pengisi ruang kosong, bukan foto yang harus utuh).
                2) foreground - foto asli, object-contain + max-h/max-w,
                   selalu menampilkan foto secara penuh sesuai rasio
                   aslinya (potret tetap potret utuh, lanskap tetap
                   lanskap utuh), tidak pernah diperbesar melebihi ukuran
                   aman kotaknya. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={slide.thumbnail_url}
              alt=""
              aria-hidden="true"
              className="absolute inset-0 size-full scale-125 object-cover blur-3xl brightness-[0.55] saturate-125"
            />
            <div className="absolute inset-3 flex items-center justify-center sm:inset-6 lg:inset-8">
              <motion.img
                src={slide.thumbnail_url}
                alt={slide.title}
                style={isActive ? { x: springParallaxX, y: springParallaxY } : undefined}
                className="max-h-full max-w-full rounded-2xl object-contain shadow-2xl ring-1 ring-white/10"
              />
            </div>
          </motion.div>
        );
      })}
      {/* Overlay gradient dibuat bias ke kiri-bawah (lihat globals.css) -
          menyatu dengan posisi blok teks editorial di bawah supaya area
          teks selalu cukup gelap untuk dibaca, sementara foto tetap
          terang/terlihat di sisi lain Hero. */}
      <div className="hero-slide-overlay absolute inset-0" aria-hidden="true" />

      {/* Blok teks editorial: category / judul / ringkasan / tanggal,
          rata kiri (bukan center) supaya terasa seperti featured news
          hero, bukan caption foto. Selalu dari data CMS existing - field
          yang tidak tersedia (category/summary/date) disembunyikan begitu
          saja, tidak pernah diisi teks buatan. AnimatePresence supaya teks
          ikut morph halus (fade + naik sedikit) setiap slide berganti,
          bukan berganti instan. */}
      <div className="absolute inset-x-0 bottom-0 z-10">
        <AnimatePresence initial={false}>
          <motion.div
            key={active.id}
            className="absolute inset-x-0 bottom-0 max-w-xl px-4 pt-16 pb-5 sm:max-w-2xl sm:px-8 sm:pb-7 lg:px-10 lg:pb-8"
            initial={prefersReducedMotion ? false : { opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={prefersReducedMotion ? undefined : { opacity: 0, y: -10 }}
            transition={prefersReducedMotion ? { duration: 0 } : TEXT_SPRING}
          >
            {active.category ? (
              <span className="mb-2 inline-flex w-fit items-center rounded-full bg-primary px-2.5 py-1 text-[11px] font-semibold tracking-wide text-white uppercase sm:mb-3 sm:text-xs">
                {active.category}
              </span>
            ) : null}
            <Link
              href={active.href}
              className="block text-xl leading-tight font-bold text-balance text-white transition-opacity hover:opacity-90 sm:text-3xl lg:text-4xl"
            >
              <span className="line-clamp-2">{active.title}</span>
            </Link>
            {active.summary ? (
              <p className="mt-2 line-clamp-2 text-sm text-white/80 sm:mt-3 sm:text-base">
                {active.summary}
              </p>
            ) : null}
            {active.date ? (
              <p className="mt-2 text-xs text-white/60 sm:mt-3 sm:text-sm">{active.date}</p>
            ) : null}
          </motion.div>
        </AnimatePresence>
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
          <div className="absolute right-4 bottom-4 z-10 flex gap-2 sm:right-8 lg:right-10">
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
