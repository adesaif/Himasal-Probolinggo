"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import {
  motion,
  useMotionValue,
  useMotionValueEvent,
  useScroll,
  useSpring,
  useTransform,
  type MotionValue,
} from "framer-motion";

import { cn } from "@/lib/utils";

export type HeroSlide = {
  id: string;
  href: string;
  title: string;
  thumbnail_url: string;
  // Hanya tampil kalau datanya ada di CMS - tidak pernah diisi teks buatan.
  category?: string | null;
  summary?: string | null;
  date?: string | null;
};

type Pose = { x: number; y: number; rotate: number; scale: number; opacity: number };

type Geometry = {
  n: number;
  cardW: number;
  cardH: number;
  scatter: Pose[];
  lineStep: number;
  lineScale: number;
  ringR: number;
  ringScale: number;
  innerR: number;
  arcR: number;
  arcCy: number;
  arcStep: number;
  arcVis: number;
  oStart: number;
  oEnd: number;
};

const DEG = Math.PI / 180;
const ARC_FADE = 12;

// Batas fase pada satu scroll progress (0..1). Semua kartu membaca progress
// yang sama - tidak ada timer per kartu.
const P = {
  lineStart: 0.2,
  lineEnd: 0.35,
  ringFormed: 0.5,
  ringEnd: 0.65,
  arcFormed: 0.8,
};

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const seg = (p: number, a: number, b: number) => clamp01((p - a) / (b - a));
const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const round2 = (v: number) => Math.round(v * 100) / 100;

// Selisih sudut terpendek - supaya kartu tidak berputar hampir 360 derajat
// saat berpindah dari orientasi ring ke orientasi arc.
function angleLerp(a: number, b: number, t: number) {
  const d = ((((b - a) % 360) + 540) % 360) - 180;
  return a + d * t;
}

function mixPose(a: Pose, b: Pose, t: number): Pose {
  return {
    x: lerp(a.x, b.x, t),
    y: lerp(a.y, b.y, t),
    rotate: angleLerp(a.rotate, b.rotate, t),
    scale: lerp(a.scale, b.scale, t),
    opacity: lerp(a.opacity, b.opacity, t),
  };
}

// Hash integer murni (bukan Math.random/Math.sin) - hasil identik di setiap
// render dan setiap engine JS, jadi komposisi scatter selalu sama.
function hash01(i: number, salt: number) {
  let t = (i + 1) * 0x9e3779b1 + salt * 0x85ebca6b;
  t = Math.imul(t ^ (t >>> 16), 0x21f0aaad);
  t = Math.imul(t ^ (t >>> 15), 0x735a2d97);
  t ^= t >>> 15;
  return (t >>> 0) / 4294967296;
}

function visibleCap(stageW: number) {
  if (stageW < 600) return 6;
  if (stageW < 960) return 12;
  return 20;
}

function computeGeometry(w: number, h: number, n: number): Geometry {
  const cardW = w >= 960 ? 112 : w >= 600 ? 92 : 72;
  const cardH = Math.round(cardW * 1.4);
  const halfW = w / 2;
  const halfH = h / 2;

  // Scatter: grid ber-jitter deterministik. Sel yang bertabrakan dengan
  // kotak teks intro di tengah dibuang, sel sisanya diacak (hash, bukan
  // Math.random) lalu diambil n pertama - sebaran merata tanpa gumpalan.
  const textHalfW = Math.min(halfW * 0.82, 290);
  const textHalfH = w < 600 ? 78 : 70;
  const usableW = w - cardW * 1.1;
  const usableH = h - cardH * 1.1;
  let cols = Math.max(2, Math.round(usableW / (cardW * 1.5)));
  let rows = Math.max(3, Math.round(usableH / (cardH * 1.25)));
  let cells: { x: number; y: number; cw: number; ch: number; key: number }[] = [];
  for (let attempt = 0; attempt < 6; attempt++) {
    const cw = usableW / cols;
    const ch = usableH / rows;
    cells = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const x = -usableW / 2 + cw * (c + 0.5);
        const y = -usableH / 2 + ch * (r + 0.5);
        const hitsText =
          Math.abs(x) < textHalfW + cardW * 0.35 && Math.abs(y) < textHalfH + cardH * 0.4;
        if (!hitsText) cells.push({ x, y, cw, ch, key: r * 97 + c });
      }
    }
    if (cells.length >= n) break;
    cols += 1;
    rows += 1;
  }
  // Sel diacak lalu diselang-seling atas/bawah - kalau sel lebih banyak dari
  // kartu, sisanya tidak menumpuk di satu sisi panggung saja.
  const byHash = (a: { key: number }, b: { key: number }) => hash01(a.key, 7) - hash01(b.key, 7);
  const top = cells.filter((c) => c.y < 0).sort(byHash);
  const bottom = cells.filter((c) => c.y >= 0).sort(byHash);
  const ordered: typeof cells = [];
  for (let k = 0; ordered.length < cells.length; k++) {
    if (k < top.length) ordered.push(top[k]);
    if (k < bottom.length) ordered.push(bottom[k]);
  }
  const scatter: Pose[] = [];
  for (let i = 0; i < n; i++) {
    const cell = ordered[i % ordered.length];
    scatter.push({
      x: cell.x + (hash01(i, 4) - 0.5) * cell.cw * 0.34,
      y: cell.y + (hash01(i, 5) - 0.5) * cell.ch * 0.28,
      rotate: (hash01(i, 2) - 0.5) * 30,
      scale: 0.8 + hash01(i, 3) * 0.2,
      opacity: 0.95,
    });
  }

  // Line: satu baris sedikit bertumpuk yang muat di lebar panggung.
  const lineScale = clamp((w * 0.9) / (n * cardW * 0.78), 0.5, 0.9);
  const lineStep = Math.min(
    cardW * lineScale * 1.05,
    (w * 0.92 - cardW * lineScale) / Math.max(n - 1, 1),
  );

  // Ring: kartu diperkecil hanya kalau keliling lingkaran tidak cukup,
  // lalu jari-jari dibatasi supaya ring selalu utuh di dalam panggung.
  let ringR = Math.min(w, h) * 0.36;
  const ringScale = clamp((2 * Math.PI * ringR) / (n * cardW * 1.08), 0.55, 1);
  ringR = Math.min(ringR, Math.min(halfW, halfH) - (cardH * ringScale) / 2 - 12);
  const innerR = ringR - (cardH * ringScale) / 2;

  // Arc: busur besar yang pusat lingkarannya di bawah panggung - hanya
  // bagian atasnya yang terlihat. arcVis = setengah sudut yang masih
  // benar-benar di dalam panggung; kartu di luar itu memudar, bukan
  // melompat keluar layar.
  const arcR = Math.max(w * 0.62, Math.min(h * 0.9, w * 1.1));
  // Panggung potret (tablet/ponsel tegak) jauh lebih tinggi dari lebarnya -
  // busur dinaikkan supaya tidak menyisakan pita kosong di bawah panel.
  const arcCy = h * (h > w * 1.1 ? 0.06 : 0.16) + arcR;
  const visX = Math.asin(clamp((halfW - cardW * 0.3) / arcR, 0, 1));
  const visY = Math.acos(clamp((arcCy - (halfH - cardH * 0.3)) / arcR, -1, 1));
  const arcVis = Math.min(visX, visY) / DEG;
  const arcStep = (cardW * 0.82) / arcR / DEG;
  const half = ((n - 1) * arcStep) / 2;
  // Sapuan dibatasi persis sebanyak yang dibutuhkan agar kartu pertama dan
  // terakhir sama-sama sempat masuk area terlihat - bukan putaran 360.
  const sweep = Math.max(half - arcVis + arcStep * 0.5, Math.min(arcStep * 0.75, 5));

  return {
    n,
    cardW,
    cardH,
    scatter,
    lineStep,
    lineScale,
    ringR,
    ringScale,
    innerR,
    arcR,
    arcCy,
    arcStep,
    arcVis,
    oStart: sweep,
    oEnd: -sweep,
  };
}

function arcOffset(p: number, g: Geometry) {
  return lerp(g.oStart, g.oEnd, ease(seg(p, P.arcFormed, 1)));
}

function poseAt(p: number, i: number, g: Geometry): Pose & { z: number } {
  const mid = (g.n - 1) / 2;
  const scatter = g.scatter[i];
  const line: Pose = { x: (i - mid) * g.lineStep, y: 0, rotate: 0, scale: g.lineScale, opacity: 1 };

  // Urutan di ring disusun searah dengan urutan di arc (indeks tengah di
  // puncak, ujung-ujung di bawah) supaya perpindahan ring->arc tidak saling
  // silang secara kacau.
  const spin = lerp(0, 24, seg(p, P.lineEnd, P.arcFormed));
  const ang = 90 + ((i + 0.5) / g.n) * 360 + spin;
  // Orientasi tangensial ring, tapi dilipat ke [-90, 90] - foto (termasuk
  // foto masayikh/tokoh) tidak pernah tampil terbalik di bagian bawah ring.
  let ringRot = ((((ang + 90) % 360) + 540) % 360) - 180;
  if (ringRot > 90) ringRot -= 180;
  else if (ringRot < -90) ringRot += 180;
  const ring: Pose = {
    x: Math.cos(ang * DEG) * g.ringR,
    y: Math.sin(ang * DEG) * g.ringR,
    rotate: ringRot,
    scale: g.ringScale,
    opacity: 1,
  };

  const rel = (i - mid) * g.arcStep + arcOffset(p, g);
  const absRel = Math.abs(rel);
  const arc: Pose = {
    x: Math.sin(rel * DEG) * g.arcR,
    y: g.arcCy - Math.cos(rel * DEG) * g.arcR,
    rotate: rel,
    scale: 1.06 - 0.16 * Math.min(absRel / Math.max(g.arcVis, 1), 1),
    opacity: 1 - ease(clamp01((absRel - g.arcVis) / ARC_FADE)),
  };

  let pose: Pose;
  if (p <= P.lineStart) pose = scatter;
  else if (p <= P.lineEnd) pose = mixPose(scatter, line, ease(seg(p, P.lineStart, P.lineEnd)));
  else if (p <= P.ringFormed) pose = mixPose(line, ring, ease(seg(p, P.lineEnd, P.ringFormed)));
  else if (p <= P.ringEnd) pose = ring;
  else pose = mixPose(ring, arc, ease(seg(p, P.ringEnd, P.arcFormed)));

  return {
    x: round2(pose.x),
    y: round2(pose.y),
    rotate: round2(pose.rotate),
    scale: round2(pose.scale),
    opacity: round2(pose.opacity),
    z: p > 0.72 ? 200 - Math.round(absRel * 2) : i + 1,
  };
}

function useMediaQuery(query: string) {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const mql = window.matchMedia(query);
      mql.addEventListener("change", onChange);
      return () => mql.removeEventListener("change", onChange);
    },
    [query],
  );
  // Snapshot server selalu false - React merender versi server saat
  // hidrasi lalu memperbarui di client, tanpa hydration mismatch.
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(query).matches,
    () => false,
  );
}

/**
 * Kartu gambar dengan sisi belakang (flip 3D) - depan: foto konten, belakang:
 * topik/judul/tanggal dari data CMS yang sama (tidak ada teks buatan).
 * Flip saat hover di perangkat dengan pointer halus, atau saat fokus
 * keyboard; di layar sentuh kartu cukup menjadi tautan biasa.
 */
function FlipCard({
  item,
  canHover,
  eager,
}: {
  item: HeroSlide;
  canHover: boolean;
  eager: boolean;
}) {
  const [flipped, setFlipped] = useState(false);

  return (
    <Link
      href={item.href}
      draggable={false}
      onMouseEnter={canHover ? () => setFlipped(true) : undefined}
      onMouseLeave={canHover ? () => setFlipped(false) : undefined}
      onFocus={() => setFlipped(true)}
      onBlur={() => setFlipped(false)}
      className="block size-full rounded-[14px] outline-none [perspective:900px] focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card"
    >
      <motion.div
        className="relative size-full [transform-style:preserve-3d]"
        animate={{ rotateY: flipped ? 180 : 0 }}
        transition={{ type: "spring", stiffness: 260, damping: 24 }}
      >
        <div className="absolute inset-0 overflow-hidden rounded-[14px] border border-foreground/10 bg-muted shadow-[0_14px_30px_-14px_rgba(15,23,42,0.45)] [backface-visibility:hidden]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={item.thumbnail_url}
            alt={item.title}
            loading={eager ? "eager" : "lazy"}
            decoding="async"
            draggable={false}
            className="size-full object-cover object-top"
          />
        </div>
        <div
          aria-hidden="true"
          className="absolute inset-0 flex flex-col justify-end gap-1 overflow-hidden rounded-[14px] border border-foreground/10 bg-card p-2.5 text-card-foreground shadow-[0_14px_30px_-14px_rgba(15,23,42,0.45)] [backface-visibility:hidden] [transform:rotateY(180deg)]"
        >
          {item.category ? (
            <span className="truncate text-[9px] font-semibold text-primary">{item.category}</span>
          ) : null}
          <span className="line-clamp-4 text-[10px] leading-tight font-semibold">{item.title}</span>
          {item.date ? (
            <span className="truncate text-[9px] text-muted-foreground">{item.date}</span>
          ) : null}
        </div>
      </motion.div>
    </Link>
  );
}

function MorphCard({
  item,
  index,
  progress,
  geo,
  canHover,
}: {
  item: HeroSlide;
  index: number;
  progress: MotionValue<number>;
  geo: Geometry;
  canHover: boolean;
}) {
  const x = useTransform(progress, (p) => poseAt(p, index, geo).x);
  const y = useTransform(progress, (p) => poseAt(p, index, geo).y);
  const rotate = useTransform(progress, (p) => poseAt(p, index, geo).rotate);
  const scale = useTransform(progress, (p) => poseAt(p, index, geo).scale);
  const opacity = useTransform(progress, (p) => poseAt(p, index, geo).opacity);
  const zIndex = useTransform(progress, (p) => poseAt(p, index, geo).z);
  // Kartu yang sudah memudar di ujung arc tidak boleh menangkap klik.
  const pointerEvents = useTransform(opacity, (o) => (o < 0.2 ? "none" : "auto"));

  return (
    <motion.div
      className="absolute top-1/2 left-1/2"
      style={{
        x,
        y,
        rotate,
        scale,
        opacity,
        zIndex,
        pointerEvents,
        width: geo.cardW,
        height: geo.cardH,
        marginLeft: -geo.cardW / 2,
        marginTop: -geo.cardH / 2,
      }}
    >
      <FlipCard item={item} canHover={canHover} eager={index < 8} />
    </motion.div>
  );
}

function BrandHeading({ brandName, tagline }: { brandName: string; tagline: string }) {
  return (
    <>
      <h1
        id="hero-heading"
        className="font-brand text-3xl leading-[1.05] font-extrabold tracking-[-0.02em] text-balance text-foreground sm:text-5xl lg:text-6xl"
      >
        {brandName}
      </h1>
      <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-balance text-muted-foreground sm:mt-4 sm:text-base">
        {tagline}
      </p>
    </>
  );
}

// Rotasi tetap (bukan acak) untuk komposisi statis - kesan kartu tersusun
// tangan tanpa animasi apa pun.
const STATIC_TILT = [-4, 2.5, -1.5, 3.5, -3, 1.5];

/**
 * Komposisi statis: dipakai untuk 0-3 konten unggulan (terlalu sedikit untuk
 * ring yang bermakna - tidak pernah menggandakan item agar terlihat penuh)
 * dan untuk pengguna prefers-reduced-motion (semua konten tetap tampil,
 * tanpa animasi scroll).
 */
function StaticHero({
  items,
  brandName,
  tagline,
}: {
  items: HeroSlide[];
  brandName: string;
  tagline: string;
}) {
  return (
    <section
      aria-labelledby="hero-heading"
      className="rounded-[28px] border bg-card px-5 py-12 sm:px-10 sm:py-16"
    >
      <div className="mx-auto max-w-2xl text-center">
        <BrandHeading brandName={brandName} tagline={tagline} />
      </div>
      {items.length > 0 ? (
        <ul className="mx-auto mt-10 flex max-w-5xl flex-wrap items-start justify-center gap-x-6 gap-y-8 sm:mt-12">
          {items.map((item, i) => (
            <li
              key={item.id}
              // Batas per breakpoint sama dengan versi animasi (6/12/20) -
              // lewat CSS, bukan JS, supaya aman untuk server render.
              className={cn(
                "w-[128px] sm:w-[156px]",
                i >= 6 && "max-sm:hidden",
                i >= 12 && "max-lg:hidden",
              )}
            >
              <Link
                href={item.href}
                className="group block rounded-[14px] outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-4 focus-visible:ring-offset-card"
              >
                <div
                  className="aspect-[5/7] overflow-hidden rounded-[14px] border border-foreground/10 bg-muted shadow-[0_14px_30px_-14px_rgba(15,23,42,0.45)] transition-transform duration-200 group-hover:-translate-y-1"
                  style={{ rotate: `${STATIC_TILT[i % STATIC_TILT.length]}deg` }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={item.thumbnail_url}
                    alt={item.title}
                    loading={i < 6 ? "eager" : "lazy"}
                    decoding="async"
                    className="size-full object-cover object-top"
                  />
                </div>
                {item.category ? (
                  <p className="mt-4 text-xs font-semibold text-primary">{item.category}</p>
                ) : null}
                <p className={cn("line-clamp-2 text-sm leading-snug font-semibold", item.category ? "mt-1" : "mt-4")}>
                  {item.title}
                </p>
                {item.date ? <p className="mt-1 text-xs text-muted-foreground">{item.date}</p> : null}
              </Link>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}

// Tinggi area scroll mengikuti jumlah konten (kelas literal supaya
// terdeteksi Tailwind) - makin banyak kartu, makin panjang ruang morph.
function sectionHeightClass(count: number) {
  if (count >= 12) return "h-[220vh] lg:h-[300vh]";
  if (count >= 8) return "h-[220vh] lg:h-[270vh]";
  return "h-[220vh] lg:h-[240vh]";
}

/**
 * Hero Beranda - TRUE scroll morph: semua kartu konten unggulan dirender
 * sekaligus di satu panggung sticky, dan SATU scroll progress (native page
 * scroll lewat useScroll, tanpa wheel/touch hijacking) menggerakkan
 * komposisi: scatter -> line -> ring -> arc bawah yang bisa disapu.
 * Komponen ini murni presentasi - datanya (items) selalu dari CMS lewat
 * finalizeHeroSlides di lib/homepage-content.ts.
 */
export function ScrollMorphHero({
  items,
  brandName,
  tagline,
}: {
  items: HeroSlide[];
  brandName: string;
  tagline: string;
}) {
  const reducedMotion = useMediaQuery("(prefers-reduced-motion: reduce)");

  if (items.length < 4 || reducedMotion) {
    return <StaticHero items={items} brandName={brandName} tagline={tagline} />;
  }

  return <MorphStage items={items} brandName={brandName} tagline={tagline} />;
}

function MorphStage({
  items,
  brandName,
  tagline,
}: {
  items: HeroSlide[];
  brandName: string;
  tagline: string;
}) {
  const sectionRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);
  const canHover = useMediaQuery("(hover: hover) and (pointer: fine)");

  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => {
      const w = Math.round(entry.contentRect.width);
      const h = Math.round(entry.contentRect.height);
      setSize((prev) => (prev && prev.w === w && prev.h === h ? prev : { w, h }));
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end end"],
  });
  const progress = useSpring(scrollYProgress, {
    stiffness: 140,
    damping: 30,
    mass: 0.35,
    restDelta: 0.0005,
  });

  const visible = useMemo(
    () => (size ? items.slice(0, visibleCap(size.w)) : []),
    [items, size],
  );
  const geo = useMemo(
    () => (size ? computeGeometry(size.w, size.h, visible.length) : null),
    [size, visible.length],
  );

  // Parallax kursor - hanya pointer halus (desktop), pengaruh kecil.
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const springX = useSpring(mouseX, { stiffness: 70, damping: 20 });
  const springY = useSpring(mouseY, { stiffness: 70, damping: 20 });
  const layerX = useTransform(springX, (v) => v * 14);
  const layerY = useTransform(springY, (v) => v * 10);

  function handlePointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!canHover || e.pointerType !== "mouse") return;
    const rect = e.currentTarget.getBoundingClientRect();
    mouseX.set(((e.clientX - rect.left) / rect.width) * 2 - 1);
    mouseY.set(((e.clientY - rect.top) / rect.height) * 2 - 1);
  }

  function resetPointer() {
    mouseX.set(0);
    mouseY.set(0);
  }

  // Kartu yang sedang di puncak arc - hanya memicu render ulang saat
  // indeksnya berubah, bukan setiap piksel scroll.
  const [focusIndex, setFocusIndex] = useState(0);
  const focusRef = useRef(0);
  const updateFocus = useCallback(
    (p: number) => {
      if (!geo) return;
      const mid = (geo.n - 1) / 2;
      const f = clamp(Math.round(mid - arcOffset(p, geo) / geo.arcStep), 0, geo.n - 1);
      if (f !== focusRef.current) {
        focusRef.current = f;
        setFocusIndex(f);
      }
    },
    [geo],
  );
  useMotionValueEvent(progress, "change", updateFocus);

  const introOpacity = useTransform(progress, [0, 0.12, 0.24], [1, 1, 0]);
  const introY = useTransform(progress, [0, 0.24], [0, -28]);
  const hintOpacity = useTransform(progress, [0, 0.06], [1, 0]);
  const ringTextOpacity = useTransform(progress, [0.42, 0.5, 0.6, 0.68], [0, 1, 1, 0]);
  const panelOpacity = useTransform(progress, [0.72, 0.8], [0, 1]);
  const panelY = useTransform(progress, [0.72, 0.8], [18, 0]);
  const panelPointer = useTransform(panelOpacity, (o) => (o < 0.3 ? "none" : "auto"));

  const focused = visible[Math.min(focusIndex, Math.max(visible.length - 1, 0))];
  const ringTextFits = geo ? geo.innerR * 2 >= 250 : false;

  return (
    <section
      ref={sectionRef}
      aria-labelledby="hero-heading"
      className={cn("relative", sectionHeightClass(items.length))}
    >
      <div className="sticky top-16 h-[calc(100svh-4rem)] py-3 lg:top-[74px] lg:h-[calc(100svh-74px)]">
        <div
          ref={stageRef}
          onPointerMove={handlePointerMove}
          onPointerLeave={resetPointer}
          className="relative h-full overflow-hidden rounded-[28px] border bg-card"
        >
          {/* Lapisan kartu - dirender setelah ukuran panggung terukur di
              client, jadi posisi (hasil trigonometri) tidak pernah ikut
              server render dan tidak bisa memicu hydration mismatch. */}
          <motion.div
            className="absolute inset-0"
            style={{ x: layerX, y: layerY }}
            initial={{ opacity: 0 }}
            animate={{ opacity: geo ? 1 : 0 }}
            transition={{ duration: 0.5 }}
          >
            {geo
              ? visible.map((item, i) => (
                  <MorphCard
                    key={item.id}
                    item={item}
                    index={i}
                    progress={progress}
                    geo={geo}
                    canHover={canHover}
                  />
                ))
              : null}
          </motion.div>

          <motion.div
            style={{ opacity: introOpacity, y: introY }}
            className="pointer-events-none absolute inset-0 z-[300] flex items-center justify-center px-6 text-center"
          >
            <div className="max-w-xl">
              <BrandHeading brandName={brandName} tagline={tagline} />
            </div>
          </motion.div>

          {ringTextFits ? (
            <motion.p
              aria-hidden="true"
              style={{ opacity: ringTextOpacity }}
              className="font-brand pointer-events-none absolute inset-0 z-[300] flex items-center justify-center px-6 text-center text-xl font-extrabold tracking-[-0.02em] text-foreground sm:text-2xl"
            >
              {brandName}
            </motion.p>
          ) : null}

          {focused ? (
            <motion.div
              style={{ opacity: panelOpacity, y: panelY, pointerEvents: panelPointer }}
              className="absolute inset-x-0 top-[8%] z-[300] flex justify-center px-6"
            >
              <div className="max-w-xl text-center">
                {focused.category ? (
                  <span className="inline-flex rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground">
                    {focused.category}
                  </span>
                ) : null}
                <Link
                  href={focused.href}
                  className="mt-3 block rounded-md text-xl leading-snug font-semibold text-balance text-foreground outline-none hover:text-primary focus-visible:ring-2 focus-visible:ring-ring sm:text-2xl"
                >
                  <span className="line-clamp-2">{focused.title}</span>
                </Link>
                {focused.date ? (
                  <p className="mt-2 text-sm text-muted-foreground">{focused.date}</p>
                ) : null}
              </div>
            </motion.div>
          ) : null}

          <motion.p
            aria-hidden="true"
            style={{ opacity: hintOpacity }}
            className="pointer-events-none absolute inset-x-0 bottom-5 z-[300] text-center text-xs text-muted-foreground"
          >
            Gulir untuk menjelajahi konten unggulan
          </motion.p>
        </div>
      </div>
    </section>
  );
}
