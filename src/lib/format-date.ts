// timeZone eksplisit Asia/Jakarta (WIB) di kedua formatter - tanpa ini,
// Intl memakai timezone proses server (di sandbox ini UTC), jadi jam
// (dan kadang tanggalnya juga, untuk waktu dini hari WIB) bisa salah
// sambil tetap diberi label "WIB" di pemanggilnya (formatDateTimeID dkk).
export function formatDateID(value: string) {
  return new Date(value).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Asia/Jakarta",
  });
}

export function formatTimeID(value: string) {
  return new Date(value).toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Jakarta",
  });
}

export function formatDateTimeID(value: string) {
  return `${formatDateID(value)}, ${formatTimeID(value)} WIB`;
}

// Dipakai khusus meta-line News Card ("16 September 2026 · 22.16 WIB") -
// pemisah titik tengah, bukan koma seperti formatDateTimeID (dipakai di
// tempat lain, mis. rentang tanggal Agenda) - sengaja fungsi terpisah
// supaya perubahan format kartu ini tidak mengubah tampilan lain yang
// sudah memakai formatDateTimeID.
export function formatCardDateTimeID(value: string) {
  return `${formatDateID(value)} · ${formatTimeID(value)} WIB`;
}

export function toDatetimeLocalInput(iso: string): string {
  const date = new Date(iso);
  const offsetMs = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
}

// Label section/bucket untuk halaman arsip (/arsip) - "Minggu Ini" untuk 7
// hari terakhir, selebihnya "September 2026" (bulan+tahun, locale id-ID) -
// dipakai untuk mengelompokkan daftar kronologis panjang jadi heading yang
// bisa di-scan, TANPA membuang/menyembunyikan konten lama ke satu bucket
// generik "lebih lama" (lihat fetchUnifiedContent + halaman /arsip).
export function formatArchiveBucketLabel(value: string): string {
  const date = new Date(value);
  const now = new Date();
  const daysAgo = (now.getTime() - date.getTime()) / (24 * 60 * 60 * 1000);
  if (daysAgo <= 7) return "Minggu Ini";
  return date.toLocaleDateString("id-ID", {
    month: "long",
    year: "numeric",
    timeZone: "Asia/Jakarta",
  });
}

export function formatEventRange(startAt: string, endAt: string | null) {
  if (!endAt) return formatDateTimeID(startAt);

  const start = new Date(startAt);
  const end = new Date(endAt);
  const sameDay = start.toDateString() === end.toDateString();

  if (sameDay) {
    return `${formatDateID(startAt)}, ${formatTimeID(startAt)} - ${formatTimeID(endAt)} WIB`;
  }
  return `${formatDateTimeID(startAt)} - ${formatDateTimeID(endAt)}`;
}
