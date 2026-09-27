// Bantuan pengisian email alumni: saran domain + validasi format. Hanya
// memeriksa FORMAT - tidak pernah mengklaim inbox benar-benar ada (tidak ada
// SMTP/login probing). Kepemilikan email dibuktikan lewat link undangan.

/** Urutan = prioritas tampil; Gmail paling atas karena paling umum. */
export const EMAIL_DOMAINS = [
  "gmail.com",
  "yahoo.com",
  "outlook.com",
  "hotmail.com",
  "icloud.com",
] as const;

// Salah ketik yang umum -> domain yang dimaksud. Hanya ditawarkan sebagai
// saran ("Maksud Anda ...?"), tidak pernah diganti otomatis.
const DOMAIN_TYPOS: Record<string, string> = {
  "gmial.com": "gmail.com",
  "gmai.com": "gmail.com",
  "gamil.com": "gmail.com",
  "gmal.com": "gmail.com",
  "gnail.com": "gmail.com",
  "gmaill.com": "gmail.com",
  "gmail.con": "gmail.com",
  "gmail.co": "gmail.com",
  "gmail.cm": "gmail.com",
  "yaho.com": "yahoo.com",
  "yahooo.com": "yahoo.com",
  "yahoo.con": "yahoo.com",
  "hotmial.com": "hotmail.com",
  "hotmai.com": "hotmail.com",
  "hotmail.con": "hotmail.com",
  "outlok.com": "outlook.com",
  "outloo.com": "outlook.com",
  "outlook.con": "outlook.com",
  "iclod.com": "icloud.com",
  "icoud.com": "icloud.com",
  "icloud.con": "icloud.com",
};

const LOCAL_PART = /^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+$/;
const EMAIL_FORMAT =
  /^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/;

export type EmailSuggestion = {
  value: string;
  /** Diisi untuk saran koreksi salah ketik. */
  isTypoFix?: boolean;
};

export function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

/**
 * Format email valid: bagian lokal & domain wajar, domain punya TLD
 * (mis. ".com", ".co.id"). Domain di luar daftar saran tetap diterima.
 */
export function isValidEmailFormat(value: string): boolean {
  const email = normalizeEmail(value);
  if (email.length > 254 || !EMAIL_FORMAT.test(email)) return false;
  const local = email.slice(0, email.lastIndexOf("@"));
  return (
    local.length <= 64 &&
    !local.startsWith(".") &&
    !local.endsWith(".") &&
    !local.includes("..")
  );
}

/**
 * Saran untuk nilai yang sedang diketik:
 * - "ahmad212"          -> ahmad212@gmail.com, @yahoo.com, ...
 * - "ahmad212@"         -> semua domain
 * - "ahmad212@ya"       -> ahmad212@yahoo.com
 * - "ahmad212@gmial.com"-> koreksi ahmad212@gmail.com
 * - email lengkap dengan domain di daftar / domain lain -> tidak ada saran
 */
export function getEmailSuggestions(value: string): EmailSuggestion[] {
  const input = value.trim();
  if (!input || /\s/.test(input)) return [];

  const at = input.indexOf("@");
  if (at === -1) {
    return LOCAL_PART.test(input)
      ? EMAIL_DOMAINS.map((d) => ({ value: `${input}@${d}` }))
      : [];
  }
  if (input.indexOf("@", at + 1) !== -1) return [];

  const local = input.slice(0, at);
  const domain = input.slice(at + 1).toLowerCase();
  if (!local || !LOCAL_PART.test(local)) return [];

  const fix = DOMAIN_TYPOS[domain];
  if (fix) return [{ value: `${local}@${fix}`, isTypoFix: true }];

  if ((EMAIL_DOMAINS as readonly string[]).includes(domain)) return [];
  return EMAIL_DOMAINS.filter((d) => d.startsWith(domain)).map((d) => ({
    value: `${local}@${d}`,
  }));
}
