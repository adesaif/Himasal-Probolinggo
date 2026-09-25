import Link from "next/link";

import { Badge } from "@/components/ui/badge";

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
 * PRINSIP: "image-first card, rasio asli dipertahankan." Foto TIDAK pernah
 * dipaksa ke kotak rasio tetap (aspect-video dahulu) lalu di-crop
 * (object-cover) atau disisakan ruang kosong (object-contain) - keduanya
 * terbukti bermasalah pada review visual nyata (crop memotong wajah;
 * contain menyisakan bidang kosong kiri-kanan). Sebagai gantinya, <img>
 * dirender natural: width 100% dari card, height auto - browser
 * menghitung tinggi dari rasio asli foto itu sendiri, jadi TIDAK ADA
 * object-fit sama sekali (tidak ada yang di-crop, tidak ada yang
 * distretch). Konsekuensinya: tinggi card mengikuti tinggi foto masing-
 * masing (portrait jadi lebih tinggi dari landscape) - itu disengaja,
 * bukan bug; self-start di wrapper mencegah CSS grid meregangkan card
 * yang lebih pendek supaya menyamai tinggi tetangganya di baris yang
 * sama (grid tetap rapi lewat kolom, bukan lewat tinggi seragam).
 * Judul/badge/ringkasan/tanggal ada di panel BIASA di bawah foto (bukan
 * overlay+gradient di atas foto) - lebih aman untuk keterbacaan dan tidak
 * menutupi bagian foto mana pun.
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
  // self-start - lihat catatan di komentar utama: mencegah grid
  // meregangkan card yang secara alami lebih pendek (foto landscape/
  // tanpa foto) supaya menyamai card tertinggi di baris yang sama.
  const wrapperClassName =
    "card-hover block self-start overflow-hidden rounded-xl border bg-card shadow-sm";

  const body = (
    <>
      {imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={imageUrl}
          alt={title}
          loading="lazy"
          className="block h-auto w-full"
        />
      ) : (
        <div className="flex aspect-video w-full items-center justify-center bg-muted text-sm text-muted-foreground">
          Tidak ada gambar
        </div>
      )}
      <div className="flex flex-col gap-1.5 p-4">
        {badge ? (
          <Badge variant="primary" className="w-fit">
            {badge}
          </Badge>
        ) : null}
        <p className="line-clamp-2 font-medium">{title}</p>
        {summary ? (
          <p className="line-clamp-2 text-sm text-muted-foreground">{summary}</p>
        ) : null}
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
