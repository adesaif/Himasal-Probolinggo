import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
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

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="id"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {children}
        <Toaster position="top-center" richColors />
      </body>
    </html>
  );
}
