import { PublicNav } from "@/components/layout/public-nav";
import { PublicFooter } from "@/components/layout/public-footer";
import { createPublicClient } from "@/lib/supabase/public";

export const revalidate = 300;

export default async function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createPublicClient();
  const { data: settings } = await supabase
    .from("site_settings")
    .select(
      "nama_organisasi, tagline, alamat, email, telepon, whatsapp, instagram_url, facebook_url, youtube_url, tiktok_url",
    )
    .single();

  return (
    <>
      <PublicNav />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
        {children}
      </main>
      <PublicFooter settings={settings} />
    </>
  );
}
