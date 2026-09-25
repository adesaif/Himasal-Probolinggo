import Link from "next/link";

import { cn } from "@/lib/utils";

export type ContentCardProps = {
  // topic_content di /topik/[slug] boleh tidak punya link_url sama sekali -
  // href null/undefined dirender sebagai kartu biasa (tidak bisa diklik),
  // bukan dipaksa jadi <a href="">.
  href?: string | null;
  title: string;
  imageUrl?: string | null;
  // Label pill di atas foto (mis. "Unggulan") - opsional, TIDAK pernah
  // diisi teks buatan; pemanggil hanya mengoper field yang memang ada
  // di data (lihat 3 lokasi pemakaian: CardGrid, /berita, /topik/[slug]).
  badge?: string | null;
  summary?: string | null;
  dateLabel?: string | null;
  // /topik/[slug] punya item topic_content dengan link_url eksternal (URL
  // penuh, bukan path internal) - satu-satunya pemanggil yang butuh ini,
  // dua pemanggil lain selalu link internal (default false).
  external?: boolean;
};

/**
 * Kartu konten reusable untuk semua grid publik (Beranda/Agenda/Galeri/
 * Struktur/Masayikh/topik custom di CardGrid, /berita, /topik/[slug]) -
 * satu-satunya tempat styling kartu berita didefinisikan supaya ketiganya
 * selalu konsisten.
 *
 * Foto full-bleed (object-cover) mengisi SELURUH kartu, bukan foto kecil
 * di tengah dengan bidang kosong kiri-kanan (pendekatan object-contain
 * sebelumnya, terbukti terlihat seperti "foto ditempel di kotak" pada
 * review visual nyata) - judul/badge/ringkasan/tanggal jadi overlay di atas
 * foto lewat gradient gelap di bagian bawah, bukan panel terpisah di bawah
 * foto. Aspect ratio kartu tetap tetap (aspect-video) supaya grid rapi
 * apa pun rasio asli foto sumbernya - object-cover yang menyesuaikan, foto
 * tidak pernah stretch/distort karena cover selalu mempertahankan rasio
 * foto sambil memotong kelebihannya. object-top dipakai sebagai heuristik
 * fokus wajar untuk foto potret/wajah (subjek foto berita pesantren
 * umumnya di bagian atas-tengah bingkai) tanpa deteksi wajah - sengaja
 * tidak menambah dependency baru.
 */
export function ContentCard({
  href,
  title,
  imageUrl,
  badge,
  summary,
  dateLabel,
  external = false,
}: ContentCardProps) {
  // self-start: grid default (align-items: stretch) akan meregangkan SEMUA
  // card di baris yang sama setinggi card TERTINGGI - card tanpa foto punya
  // panel tambahan di bawah placeholder jadi lebih tinggi dari card
  // berfoto (yang tingginya cuma aspect-video, teks jadi overlay di
  // DALAM foto, bukan menambah tinggi). Tanpa self-start, card berfoto di
  // baris yang sama akan diregangkan, menyisakan bidang navy kosong di
  // bawahnya - persis masalah yang sedang diperbaiki, hanya pindah tempat.
  const wrapperClassName =
    "card-hover group block self-start overflow-hidden rounded-xl border bg-card shadow-sm";

  const body = (
    <>
      <div className="relative aspect-video w-full overflow-hidden bg-muted">
        {imageUrl ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imageUrl}
              alt={title}
              loading="lazy"
              className="absolute inset-0 size-full object-cover object-top transition-transform duration-300 ease-out group-hover:scale-[1.03]"
            />
            {/* Gradient transparan -> gelap di bawah, bukan overlay rata di
                seluruh foto, supaya foto tetap terang/terlihat di bagian
                atas dan teks tetap terbaca di bagian bawah. */}
            <div
              aria-hidden="true"
              className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/15 to-transparent"
            />
            <div className="absolute inset-x-0 bottom-0 flex flex-col gap-1.5 p-4">
              {badge ? (
                <span className="inline-flex w-fit items-center rounded-full bg-primary px-2.5 py-1 text-[11px] font-semibold tracking-wide text-primary-foreground uppercase">
                  {badge}
                </span>
              ) : null}
              <p className="line-clamp-2 font-semibold text-white">{title}</p>
              {summary ? (
                <p className="line-clamp-2 text-sm text-white/80">{summary}</p>
              ) : null}
              {dateLabel ? <p className="text-xs text-white/60">{dateLabel}</p> : null}
            </div>
          </>
        ) : (
          <div className="flex size-full items-center justify-center text-sm text-muted-foreground">
            Tidak ada gambar
          </div>
        )}
      </div>

      {/* Tanpa foto tidak ada apa pun untuk di-overlay - judul/ringkasan/
          tanggal jatuh ke panel biasa di bawah placeholder, gaya sama
          dengan card konten lain di situs (bukan overlay gelap di atas
          kotak abu-abu kosong). */}
      {!imageUrl ? (
        <div className="flex flex-col gap-1 p-4">
          {badge ? (
            <span className="inline-flex w-fit items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
              {badge}
            </span>
          ) : null}
          <p className={cn("line-clamp-2 font-medium", badge && "mt-1")}>{title}</p>
          {summary ? (
            <p className="line-clamp-2 text-sm text-muted-foreground">{summary}</p>
          ) : null}
          {dateLabel ? <p className="text-xs text-muted-foreground">{dateLabel}</p> : null}
        </div>
      ) : null}
    </>
  );

  if (!href) {
    return <div className={wrapperClassName}>{body}</div>;
  }

  if (external) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={wrapperClassName}>
        {body}
      </a>
    );
  }

  return (
    <Link href={href} className={wrapperClassName}>
      {body}
    </Link>
  );
}
