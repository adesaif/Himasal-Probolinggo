import { Button } from "@/components/ui/button";

export default function BerandaPage() {
  return (
    <div className="flex flex-col items-center gap-6 py-16 text-center">
      <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
        Himpunan Alumni Santri Lirboyo Probolinggo
      </h1>
      <p className="max-w-xl text-muted-foreground">
        Website resmi HIMASAL Probolinggo sedang dalam tahap pembangunan.
        Konten Beranda akan dikelola melalui dashboard Admin.
      </p>
      <Button asChild>
        <a href="/login">Masuk ke Akun</a>
      </Button>
    </div>
  );
}
