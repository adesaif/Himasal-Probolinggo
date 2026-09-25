import Link from "next/link";

export type ContentCardProps = {
  // topic_content di /topik/[slug] boleh tidak punya link_url sama sekali -
  // href null/undefined dirender sebagai kartu biasa (tidak bisa diklik),
  // bukan dipaksa jadi <a href="">.
  href?: string | null;
  title: string;
  imageUrl?: string | null;
  // Badge kecil di pojok foto - SELALU label topik dari site_topics
  // (mis. "Berita", "Masayikh"), bukan flag ad-hoc seperti "Unggulan".
  // Satu warna tema (primary) untuk semua topik supaya konsisten dengan
  // identitas HIMASAL - bukan warna berbeda per topik seperti referensi.
  topicLabel?: string | null;
  // Ringkasan singkat di bawah judul - HANYA dirender kalau tersedia,
  // tidak pernah diisi placeholder kalau kosong (lihat pemanggil: excerpt
  // Berita, deskripsi Masayikh/topic_content, jabatan Struktur, dst).
  summary?: string | null;
  // Meta-line tanggal di baris paling bawah - untuk Berita ini sudah
  // diformat sebagai "16 September 2026 · 22.16 WIB" oleh pemanggil (lihat
  // formatCardDateTimeID di lib/format-date.ts). Disembunyikan total kalau
  // null (konten tanpa published_at, mis. Struktur/Masayikh/Galeri).
  dateLabel?: string | null;
  // /topik/[slug] punya item topic_content dengan link_url eksternal (URL
  // penuh, bukan path internal) - satu-satunya pemanggil yang butuh ini,
  // dua pemanggil lain selalu link internal (default false).
  external?: boolean;
};

/**
 * Kartu konten reusable untuk semua grid publik (Beranda/Agenda/Galeri/
 * Struktur/Masayikh/topik custom di CardGrid, /berita, /topik/[slug]) -
 * satu-satunya tempat styling kartu konten didefinisikan supaya semuanya
 * selalu konsisten. Gaya target: editorial premium - foto besar dominan,
 * panel informasi mengikuti tema (bg-card/text-card-foreground), badge
 * topik kecil elegant, judul + ringkasan singkat + tanggal.
 *
 * FOTO - proporsi tetap (~55-60% tinggi card) dengan object-cover supaya
 * grid selalu rapi/konsisten walau aspect ratio foto asli berbeda-beda.
 * object-top dipakai secara SERAGAM (bukan per-foto) sebagai heuristik
 * paling aman untuk menghindari crop wajah/kepala: foto potret (wajah di
 * bagian atas) maupun lanskap (subjek utama biasanya di tengah/atas)
 * sama-sama lebih aman dipotong dari bawah daripada dari atas. ini bukan
 * focal-point per-gambar (butuh infra deteksi wajah yang tidak ada) -
 * kalau di masa depan ada kebutuhan crop yang lebih presisi per foto,
 * tambahkan field focal-point di sumber datanya, jangan hardcode di sini.
 */
export function ContentCard({
  href,
  title,
  imageUrl,
  topicLabel,
  summary,
  dateLabel,
  external = false,
}: ContentCardProps) {
  // self-start - mencegah grid meregangkan card yang secara alami lebih
  // pendek (judul/ringkasan lebih singkat dari tetangganya) supaya
  // menyamai card tertinggi di baris yang sama.
  const wrapperClassName =
    "card-hover group block self-start overflow-hidden rounded-[20px] border bg-card shadow-sm";

  const body = (
    <>
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-muted">
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imageUrl}
            alt={title}
            loading="lazy"
            className="h-full w-full object-cover object-top transition-transform duration-300 ease-out group-hover:scale-[1.02]"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-sm text-muted-foreground">
            Tidak ada gambar
          </div>
        )}
        {topicLabel ? (
          <span className="absolute top-3 left-3 rounded-full bg-primary px-3 py-1 text-[11px] font-semibold tracking-wide text-primary-foreground uppercase shadow-sm">
            {topicLabel}
          </span>
        ) : null}
      </div>
      <div className="flex flex-col gap-2 px-5 py-4">
        <p className="line-clamp-3 text-base leading-snug font-semibold text-balance">{title}</p>
        {summary ? (
          <p className="line-clamp-2 text-sm leading-relaxed text-muted-foreground">{summary}</p>
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
