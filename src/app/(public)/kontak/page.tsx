import type { Metadata } from "next";
import { Mail, MapPin, MessageCircle, Phone } from "lucide-react";

import { createPublicClient } from "@/lib/supabase/public";
import { Card, CardContent } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Kontak",
  description: "Informasi kontak resmi HIMASAL Probolinggo.",
};

export const revalidate = 300;

function ContactRow({
  icon: Icon,
  label,
  value,
  href,
}: {
  icon: typeof Mail;
  label: string;
  value: string | null;
  href?: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <Icon className="mt-0.5 size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
      <div>
        <p className="text-sm text-muted-foreground">{label}</p>
        {value ? (
          href ? (
            <a href={href} className="font-medium hover:underline">
              {value}
            </a>
          ) : (
            <p className="font-medium">{value}</p>
          )
        ) : (
          <p className="text-sm text-muted-foreground">Belum tersedia</p>
        )}
      </div>
    </div>
  );
}

export default async function KontakPage() {
  const supabase = createPublicClient();
  const { data: settings } = await supabase
    .from("site_settings")
    .select(
      "alamat, email, telepon, whatsapp, instagram_url, facebook_url, youtube_url, tiktok_url, maps_embed_url",
    )
    .single();

  const socialLinks = [
    settings?.instagram_url && { label: "Instagram", href: settings.instagram_url },
    settings?.facebook_url && { label: "Facebook", href: settings.facebook_url },
    settings?.youtube_url && { label: "YouTube", href: settings.youtube_url },
    settings?.tiktok_url && { label: "TikTok", href: settings.tiktok_url },
  ].filter((v): v is { label: string; href: string } => Boolean(v));

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <h1 className="text-3xl font-semibold tracking-tight">Kontak</h1>

      <Card>
        <CardContent className="flex flex-col gap-5">
          <ContactRow icon={MapPin} label="Alamat Sekretariat" value={settings?.alamat ?? null} />
          <ContactRow
            icon={Phone}
            label="Telepon"
            value={settings?.telepon ?? null}
            href={settings?.telepon ? `tel:${settings.telepon}` : undefined}
          />
          <ContactRow
            icon={MessageCircle}
            label="WhatsApp"
            value={settings?.whatsapp ?? null}
            href={settings?.whatsapp ? `https://wa.me/${settings.whatsapp.replace(/\D/g, "")}` : undefined}
          />
          <ContactRow
            icon={Mail}
            label="Email"
            value={settings?.email ?? null}
            href={settings?.email ? `mailto:${settings.email}` : undefined}
          />

          {socialLinks.length > 0 ? (
            <div>
              <p className="text-sm text-muted-foreground">Media Sosial</p>
              <div className="mt-1 flex flex-wrap gap-3">
                {socialLinks.map((s) => (
                  <a
                    key={s.label}
                    href={s.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium hover:underline"
                  >
                    {s.label}
                  </a>
                ))}
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>

      {settings?.maps_embed_url ? (
        <div className="overflow-hidden rounded-lg border">
          <iframe
            src={settings.maps_embed_url}
            title="Lokasi Sekretariat HIMASAL Probolinggo"
            className="h-72 w-full"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          />
        </div>
      ) : null}
    </div>
  );
}
