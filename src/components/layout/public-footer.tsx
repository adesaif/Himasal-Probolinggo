import Link from "next/link";
import { Mail, Phone } from "lucide-react";

import { HimasalLogo } from "@/components/shared/himasal-logo";
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

// Kontak bukan Topik - selalu tampil. Sisanya (SEMUA topik aktif, sistem
// maupun custom) diambil dari site_topics, diurutkan sesuai display_order.
function buildFooterLinks(topics: SiteTopic[] | null | undefined) {
  const active = [...(topics ?? [])]
    .filter((t) => t.is_active)
    .sort((a, b) => a.display_order - b.display_order);
  const links = active.map((topic) => ({ href: topicHref(topic), label: topic.label }));
  links.push({ href: "/kontak", label: "Kontak" });
  return links;
}

export function PublicFooter({
  settings,
  topics,
}: {
  settings: SiteSettings | null;
  topics?: SiteTopic[] | null;
}) {
  const namaOrganisasi = settings?.nama_organisasi || "HIMASAL Probolinggo";
  const navLinks = buildFooterLinks(topics);
  const socialLinks = [
    settings?.instagram_url && { href: settings.instagram_url, label: "Instagram" },
    settings?.facebook_url && { href: settings.facebook_url, label: "Facebook" },
    settings?.youtube_url && { href: settings.youtube_url, label: "YouTube" },
    settings?.tiktok_url && { href: settings.tiktok_url, label: "TikTok" },
  ].filter((v): v is { href: string; label: string } => Boolean(v));
  // Kolom kontak disembunyikan total (bukan dirender kosong) kalau belum
  // ada satu pun info kontak/sosial yang diisi Admin - ditemukan lewat
  // review visual nyata: dengan site_settings kosong, kolom ketiga tampil
  // sebagai ruang kosong yang timpang di grid 3 kolom.
  const hasContact = Boolean(settings?.email || settings?.telepon || socialLinks.length > 0);

  return (
    <footer className="border-t bg-secondary/40">
      <div
        className={cn(
          "mx-auto grid max-w-6xl grid-cols-1 gap-8 px-4 py-8",
          hasContact ? "sm:grid-cols-3" : "sm:grid-cols-2",
        )}
      >
        <div>
          <div className="flex items-center gap-2">
            <HimasalLogo heightClassName="h-10" />
            <p className="font-semibold tracking-tight">{namaOrganisasi}</p>
          </div>
          {settings?.tagline ? (
            <p className="mt-2 text-sm text-muted-foreground">{settings.tagline}</p>
          ) : null}
        </div>

        <nav aria-label="Navigasi footer" className="flex flex-col gap-2 text-sm">
          {navLinks.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-muted-foreground hover:text-foreground"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        {hasContact ? (
          <div className="flex flex-col gap-2 text-sm text-muted-foreground">
            {settings?.email ? (
              <a
                href={`mailto:${settings.email}`}
                className="flex items-center gap-2 hover:text-foreground"
              >
                <Mail className="size-4" aria-hidden="true" />
                {settings.email}
              </a>
            ) : null}
            {settings?.telepon ? (
              <a
                href={`tel:${settings.telepon}`}
                className="flex items-center gap-2 hover:text-foreground"
              >
                <Phone className="size-4" aria-hidden="true" />
                {settings.telepon}
              </a>
            ) : null}
            {socialLinks.length > 0 ? (
              <div className="mt-1 flex items-center gap-3">
                {socialLinks.map(({ href, label }) => (
                  <a
                    key={label}
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium hover:text-foreground hover:underline"
                  >
                    {label}
                  </a>
                ))}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
      <div className="border-t px-4 py-4 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} {namaOrganisasi}
      </div>
    </footer>
  );
}
