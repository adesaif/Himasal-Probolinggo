import { PublicNav } from "@/components/layout/public-nav";

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <PublicNav />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
        {children}
      </main>
      <footer className="border-t px-4 py-6 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} HIMASAL Probolinggo — Himpunan Alumni
        Santri Lirboyo
      </footer>
    </>
  );
}
