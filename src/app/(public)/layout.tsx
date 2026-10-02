import { PublicNav } from "@/components/layout/public-nav";
import { PublicFooter } from "@/components/layout/public-footer";
import { PageTransition } from "@/components/shared/page-transition";
import { createPublicClient } from "@/lib/supabase/public";
import { TOPIC_SELECT_COLUMNS } from "@/lib/topics";

// force-dynamic (bukan revalidate=300) - nav (hamburger + desktop) dan
// footer dirender di sini untuk SEMUA halaman publik, jadi kalau layout ini
// memakai ISR time-based, perubahan Admin ke site_topics (tambah/rename/
// aktif/nonaktif/hapus topik) bisa butuh waktu sampai 5 menit untuk
// tercermin di nav - user browsing ke rute manapun yang bukan Beranda bisa
// melihat nav basi selama itu (client-side navigation antar halaman dalam
// layout yang sama tidak memicu fetch ulang sebelum window revalidate-nya
// habis). Sama seperti alasan Beranda (page.tsx) sudah lebih dulu memakai
// force-dynamic: supaya perubahan topik dari CMS Admin langsung tampil di
// navigasi publik tanpa menunggu revalidasi.
export const dynamic = "force-dynamic";

export default async function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createPublicClient();
  const [{ data: settings }, { data: topics }] = await Promise.all([
    supabase
      .from("site_settings")
      .select(
        "nama_organisasi, tagline, alamat, email, telepon, whatsapp, instagram_url, facebook_url, youtube_url, tiktok_url",
      )
      .single(),
    supabase.from("site_topics").select(TOPIC_SELECT_COLUMNS),
  ]);

  return (
    <>
      <PublicNav topics={topics} />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
        <PageTransition>{children}</PageTransition>
      </main>
      <PublicFooter settings={settings} topics={topics} />
    </>
  );
}
