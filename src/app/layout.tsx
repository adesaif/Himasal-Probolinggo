import type { Metadata } from "next";
import { Geist, Geist_Mono, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

import { Toaster } from "@/components/ui/sonner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Khusus wordmark brand lockup (BrandLockup) - dibandingkan dengan Geist
// (dipakai untuk seluruh UI lain), Plus Jakarta Sans lebih terasa seperti
// logotype institusional (humanist, sedikit lebih hangat) daripada teks UI
// biasa, membantu wordmark terbaca sebagai SATU identitas dengan lambang,
// bukan berbaur dengan teks navigasi di sekelilingnya.
const plusJakartaSans = Plus_Jakarta_Sans({
  variable: "--font-plus-jakarta-sans",
  subsets: ["latin"],
  weight: ["700", "800"],
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
const siteDescription =
  "Website dan sistem informasi resmi Himpunan Alumni Santri Lirboyo (HIMASAL) Probolinggo.";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "HIMASAL Probolinggo",
    template: "%s | HIMASAL Probolinggo",
  },
  description: siteDescription,
  openGraph: {
    type: "website",
    locale: "id_ID",
    siteName: "HIMASAL Probolinggo",
    title: "HIMASAL Probolinggo",
    description: siteDescription,
  },
};

// Tema default HARUS tetap Navy Blue (class ".dark" di globals.css). Script
// ini HANYA melepas class "dark" kalau pengunjung sebelumnya memilih Light
// Mode (disimpan localStorage["himasal-theme"] oleh ThemeToggle) - dijalankan
// sebelum hydration supaya tidak ada flash warna. Tanpa preferensi tersimpan,
// halaman tetap Navy persis seperti sebelumnya.
const THEME_INIT_SCRIPT = `
try {
  if (localStorage.getItem("himasal-theme") === "light") {
    document.documentElement.classList.remove("dark");
  }
} catch (e) {}
`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="id"
      suppressHydrationWarning
      // Tema HIMASAL Navy tetap default (lihat token ".dark" di globals.css).
      // Class ini di-render dari server sebagai Navy; ThemeToggle + script
      // di <head> di bawah yang mengelola pergantian ke Light Mode di
      // client tanpa mengubah default ini.
      className={`${geistSans.variable} ${geistMono.variable} ${plusJakartaSans.variable} h-full antialiased dark`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="min-h-full flex flex-col">
        {children}
        <Toaster position="top-center" richColors />
      </body>
    </html>
  );
}
