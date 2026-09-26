import Link from "next/link";
import { Mail, MapPin, MessageCircle, Phone } from "lucide-react";

import { BrandLockup } from "@/components/shared/brand-lockup";
import { topicHref, type SiteTopic } from "@/lib/topics";
import { cn } from "@/lib/utils";

type SiteSettings = {
  nama_organisasi: string | null;
  tagline: string | null;
  alamat: string | null;
  email: string | null;
  telepon: string | null;
  whatsapp: string | null;
  instagram_url: string | null;
  facebook_url: string | null;
  youtube_url: string | null;
  tiktok_url: string | null;
};

type FooterLink = { href: string; label: string };

// Tiga topik sistem yang benar-benar bersifat "tentang organisasi" (bukan
// aktivitas/konten berjalan) - dipakai HANYA untuk memutuskan link itu masuk
// kolom Navigasi atau Organisasi, sama sekali tidak menghardcode label/href-
// nya sendiri (itu tetap dari row site_topics). Presedennya persis
// SYSTEM_TOPIC_ICON di public-nav.tsx: klasifikasi tampilan berdasar `key`,
// bukan sumber data baru. Topik custom apa pun (key di luar tiga ini) selalu
// jatuh ke Navigasi, sehingga topik baru otomatis tampil tanpa kode baru.
const ORGANIZATION_TOPIC_KEYS = new Set(["profil", "struktur", "masayikh"]);

// Beranda & Kontak bukan Topik (tidak ada di site_topics) - selalu tetap
// tampil, sama seperti public-nav.tsx. Sisanya (semua topik aktif) dipisah
// dua kolom berdasar ORGANIZATION_TOPIC_KEYS di atas, diurutkan sesuai
// display_order Admin.
function buildFooterColumns(topics: SiteTopic[] | null | undefined) {
  const active = [...(topics ?? [])]
    .filter((t) => t.is_active)
    .sort((a, b) => a.display_order - b.display_order);

  const navigasi: FooterLink[] = [{ href: "/", label: "Beranda" }];
  const organisasi: FooterLink[] = [];

  for (const topic of active) {
    const link = { href: topicHref(topic), label: topic.label };
    if (topic.is_system && ORGANIZATION_TOPIC_KEYS.has(topic.key)) {
      organisasi.push(link);
    } else {
      navigasi.push(link);
    }
  }

  navigasi.push({ href: "/kontak", label: "Kontak" });
  return { navigasi, organisasi };
}

function FooterColumn({ heading, links }: { heading: string; links: FooterLink[] }) {
  return (
    <div className="flex flex-col gap-3.5">
      <p className="text-sm font-semibold text-foreground">{heading}</p>
      <nav className="flex flex-col gap-2.5 text-sm">
        {links.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="text-muted-foreground transition-colors hover:text-primary"
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}

export function PublicFooter({
  settings,
  topics,
}: {
  settings: SiteSettings | null;
  topics?: SiteTopic[] | null;
}) {
  const namaOrganisasi = settings?.nama_organisasi || "HIMASAL Probolinggo";
  const deskripsi = settings?.tagline || "Himpunan Alumni Santri Lirboyo Probolinggo";
  const { navigasi, organisasi } = buildFooterColumns(topics);

  const socialLinks = [
    settings?.instagram_url && { href: settings.instagram_url, label: "Instagram" },
    settings?.facebook_url && { href: settings.facebook_url, label: "Facebook" },
    settings?.youtube_url && { href: settings.youtube_url, label: "YouTube" },
    settings?.tiktok_url && { href: settings.tiktok_url, label: "TikTok" },
  ].filter((v): v is { href: string; label: string } => Boolean(v));

  // Kolom Kontak disembunyikan total (bukan dirender kosong) kalau belum ada
  // satu pun info yang diisi Admin - grid otomatis mengikut ke jumlah kolom
  // yang benar-benar punya isi, bukan menyisakan ruang kosong yang timpang.
  const hasContact = Boolean(
    settings?.alamat || settings?.email || settings?.telepon || settings?.whatsapp || socialLinks.length > 0,
  );
  const hasOrganisasi = organisasi.length > 0;

  // Kolom link (di luar Brand) yang benar-benar tampil - dipakai untuk
  // memilih grid-template yang pas (2/3/4 kolom), supaya footer tidak pernah
  // menyisakan slot kosong hanya karena Organisasi atau Kontak belum terisi.
  const visibleLinkColumns = 1 + (hasOrganisasi ? 1 : 0) + (hasContact ? 1 : 0);

  return (
    <footer className="border-t bg-secondary/40">
      <div
        className={cn(
          "mx-auto grid max-w-6xl grid-cols-1 gap-x-10 gap-y-10 px-4 py-10 sm:grid-cols-2 sm:gap-y-12 lg:gap-x-14 lg:py-16",
          visibleLinkColumns === 1 && "lg:grid-cols-[2fr_1fr]",
          visibleLinkColumns === 2 && "lg:grid-cols-[2fr_1fr_1fr]",
          visibleLinkColumns === 3 && "lg:grid-cols-[2fr_1fr_1fr_1fr]",
        )}
      >
        <div className="flex flex-col gap-4 sm:col-span-2 lg:col-span-1">
          <BrandLockup />
          <p className="max-w-[34ch] text-sm leading-relaxed text-muted-foreground">{deskripsi}</p>
          {socialLinks.length > 0 ? (
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
              {socialLinks.map(({ href, label }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted-foreground transition-colors hover:text-primary"
                >
                  {label}
                </a>
              ))}
            </div>
          ) : null}
        </div>

        <FooterColumn heading="Navigasi" links={navigasi} />

        {hasOrganisasi ? <FooterColumn heading="Organisasi" links={organisasi} /> : null}

        {hasContact ? (
          <div
            className={cn(
              "flex flex-col gap-3.5",
              // Di grid 2 kolom (tablet), Kontak jadi ganjil-satu-keluar kalau
              // Organisasi juga tampil (Navigasi+Organisasi sudah mengisi
              // penuh baris sebelumnya) - span 2 kolom di sini supaya tidak
              // menggantung sendirian dengan ruang kosong di sampingnya.
              hasOrganisasi && "sm:col-span-2 lg:col-span-1",
            )}
          >
            <p className="text-sm font-semibold text-foreground">Kontak</p>
            <div className="flex flex-col gap-2.5 text-sm text-muted-foreground">
              {settings?.alamat ? (
                <p className="flex items-start gap-2">
                  <MapPin className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                  <span>{settings.alamat}</span>
                </p>
              ) : null}
              {settings?.telepon ? (
                <a
                  href={`tel:${settings.telepon}`}
                  className="flex items-center gap-2 transition-colors hover:text-primary"
                >
                  <Phone className="size-4 shrink-0" aria-hidden="true" />
                  {settings.telepon}
                </a>
              ) : null}
              {settings?.whatsapp ? (
                <a
                  href={`https://wa.me/${settings.whatsapp.replace(/\D/g, "")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 transition-colors hover:text-primary"
                >
                  <MessageCircle className="size-4 shrink-0" aria-hidden="true" />
                  {settings.whatsapp}
                </a>
              ) : null}
              {settings?.email ? (
                <a
                  href={`mailto:${settings.email}`}
                  className="flex items-center gap-2 transition-colors hover:text-primary"
                >
                  <Mail className="size-4 shrink-0" aria-hidden="true" />
                  {settings.email}
                </a>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>

      <div className="border-t">
        <p className="mx-auto max-w-6xl px-4 py-5 text-xs text-muted-foreground">
          © {new Date().getFullYear()} {namaOrganisasi}
        </p>
      </div>
    </footer>
  );
}
