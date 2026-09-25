import Link from "next/link";

import { Badge } from "@/components/ui/badge";

export type ContentCardProps = {
  // topic_content di /topik/[slug] boleh tidak punya link_url sama sekali -
  // href null/undefined dirender sebagai kartu biasa (tidak bisa diklik),
  // bukan dipaksa jadi <a href="">.
  href?: string | null;
  title: string;
  imageUrl?: string | null;
  // Label pill di atas judul (mis. "Unggulan") - opsional, TIDAK pernah
  // diisi teks buatan; pemanggil hanya mengoper field yang memang ada
  // di data (lihat 3 lokasi pemakaian: CardGrid, /berita, /topik/[slug]).
  badge?: string | null;
  // Meta-line di bawah judul - untuk Berita ini sudah diformat sebagai
  // "16 September 2026 · 22.16 WIB" oleh pemanggil (lihat
  // formatCardDateTimeID di lib/format-date.ts); section non-Berita
  // (Struktur/Masayikh/topik custom) memakai slot yang sama untuk teks
  // singkat lain (jabatan/deskripsi) - stylingnya cocok untuk keduanya
  // (kecil, muted, satu baris).
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
 * Dua zona jelas: FOTO lalu INFORMASI, terasa satu kesatuan (bukan foto +
 * footer kotak yang ditempel) lewat background & padding yang konsisten
 * dengan sisa card, bukan panel dengan gaya berbeda.
 *
 * FOTO - prinsip "image-first, rasio asli dipertahankan": TIDAK pernah
 * dipaksa ke kotak rasio tetap lalu di-crop (object-cover, pernah dicoba,
 * terbukti memotong wajah pada review visual nyata) atau disisakan ruang
 * kosong (object-contain di kotak tetap, juga pernah dicoba, menyisakan
 * bidang kosong kiri-kanan). <img> dirender natural: width 100% dari
 * card, height auto - browser menghitung tinggi dari rasio asli foto itu
 * sendiri, jadi TIDAK ADA object-fit sama sekali (tidak ada yang di-crop,
 * tidak ada yang distretch). Konsekuensinya: tinggi card mengikuti tinggi
 * foto masing-masing (portrait jadi lebih tinggi dari landscape) - itu
 * disengaja, bukan bug; self-start di wrapper mencegah CSS grid
 * meregangkan card yang lebih pendek supaya menyamai tinggi tetangganya
 * di baris yang sama (grid tetap rapi lewat kolom, bukan lewat tinggi
 * seragam). Hover men-scale foto sangat halus (1.02) - overflow-hidden
 * pada wrapper meng-clip-nya rapi di dalam rounded corner, tidak pernah
 * menyingkap/memotong bagian foto yang sebelumnya tak terlihat.
 *
 * INFORMASI - judul + satu meta-line kecil (untuk Berita: tanggal+jam
 * WIB dari published_at, diformat pemanggil lewat formatCardDateTimeID).
 * Sengaja TANPA ringkasan/excerpt - desain editorial minimal, bukan
 * dashboard padat informasi.
 */
export function ContentCard({
  href,
  title,
  imageUrl,
  badge,
  dateLabel,
  external = false,
}: ContentCardProps) {
  // self-start - lihat catatan di komentar utama: mencegah grid
  // meregangkan card yang secara alami lebih pendek (foto landscape/
  // tanpa foto) supaya menyamai card tertinggi di baris yang sama.
  const wrapperClassName =
    "card-hover group block self-start overflow-hidden rounded-[20px] border bg-card shadow-sm";

  const body = (
    <>
      {imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={imageUrl}
          alt={title}
          loading="lazy"
          className="block h-auto w-full transition-transform duration-300 ease-out group-hover:scale-[1.02]"
        />
      ) : (
        <div className="flex aspect-video w-full items-center justify-center bg-muted text-sm text-muted-foreground">
          Tidak ada gambar
        </div>
      )}
      <div className="flex flex-col gap-2 px-5 py-4">
        {badge ? (
          <Badge variant="primary" className="w-fit">
            {badge}
          </Badge>
        ) : null}
        <p className="line-clamp-3 text-base leading-snug font-semibold text-balance">{title}</p>
        {dateLabel ? <p className="text-xs text-muted-foreground">{dateLabel}</p> : null}
      </div>
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
