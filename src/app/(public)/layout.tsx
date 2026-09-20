import { PublicNav } from "@/components/layout/public-nav";
import { PublicFooter } from "@/components/layout/public-footer";
import { PageTransition } from "@/components/shared/page-transition";
import { createPublicClient } from "@/lib/supabase/public";
import { TOPIC_SELECT_COLUMNS } from "@/lib/topics";

export const revalidate = 300;

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
