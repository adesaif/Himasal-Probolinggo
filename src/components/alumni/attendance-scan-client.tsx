"use client";

import { useCallback, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";
import { extractAttendanceToken } from "@/lib/attendance";
import { QrCodeScanner } from "@/components/alumni/qr-code-scanner";

type ScanResult =
  | { state: "idle" }
  | { state: "loading" }
  | { state: "success" }
  | { state: "error"; message: string };

export function AttendanceScanClient() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [result, setResult] = useState<ScanResult>({ state: "idle" });
  const [manualInput, setManualInput] = useState("");

  const submit = useCallback(
    async (rawValue: string) => {
      const token = extractAttendanceToken(rawValue);
      if (!token) {
        setResult({ state: "error", message: "QR tidak valid" });
        return;
      }

      setResult({ state: "loading" });
      const supabase = createClient();
      const { error } = await supabase.rpc("submit_attendance", {
        p_token: token,
      });

      if (error) {
        setResult({ state: "error", message: error.message });
        return;
      }

      setResult({ state: "success" });
      // Bersihkan token dari URL supaya tidak ter-submit ulang saat refresh.
      router.replace("/dashboard/absensi/scan");
    },
    [router],
  );

  useEffect(() => {
    const tokenParam = searchParams.get("token");
    if (!tokenParam) return;
    const tokenFromUrl: string = tokenParam;

    // Logika di-inline (bukan memanggil `submit` dari luar effect) supaya
    // setState awal ("loading") terjadi di dalam async function milik effect
    // ini sendiri, bukan lewat pemanggilan fungsi lain secara sinkron.
    let cancelled = false;
    async function run() {
      const token = extractAttendanceToken(tokenFromUrl);
      if (!token) {
        if (!cancelled) setResult({ state: "error", message: "QR tidak valid" });
        return;
      }

      setResult({ state: "loading" });
      const supabase = createClient();
      const { error } = await supabase.rpc("submit_attendance", { p_token: token });

      if (cancelled) return;

      if (error) {
        setResult({ state: "error", message: error.message });
        return;
      }

      setResult({ state: "success" });
      router.replace("/dashboard/absensi/scan");
    }

    run();
    return () => {
      cancelled = true;
    };
    // Hanya dijalankan sekali saat halaman dibuka dengan ?token= di URL.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (result.state === "loading") {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-3 py-10">
          <Loader2 className="size-8 animate-spin text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Memproses absensi...</p>
        </CardContent>
      </Card>
    );
  }

  if (result.state === "success") {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
          <CheckCircle2 className="size-12 text-green-600" aria-hidden="true" />
          <p className="text-lg font-semibold">Absensi berhasil dicatat</p>
          <p className="text-sm text-muted-foreground">
            Status Anda untuk kegiatan ini: HADIR.
          </p>
          <div className="mt-2 flex flex-wrap justify-center gap-2">
            <Button asChild>
              <Link href="/dashboard/absensi/riwayat">Lihat Riwayat</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/dashboard/absensi">Kembali</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (result.state === "error") {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
          <XCircle className="size-12 text-destructive" aria-hidden="true" />
          <p className="text-lg font-semibold">Absensi gagal</p>
          <p className="text-sm text-muted-foreground">{result.message}</p>
          <div className="mt-2 flex flex-wrap justify-center gap-2">
            <Button onClick={() => setResult({ state: "idle" })}>
              Coba Lagi
            </Button>
            <Button variant="outline" asChild>
              <Link href="/dashboard/absensi">Kembali</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <QrCodeScanner onDecode={submit} />

      <div className="flex flex-col gap-2">
        <p className="text-center text-xs text-muted-foreground">
          Tidak bisa memindai? Tempel link atau kode absensi secara manual.
        </p>
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (manualInput.trim()) submit(manualInput);
          }}
        >
          <Input
            placeholder="Tempel link/kode absensi"
            value={manualInput}
            onChange={(e) => setManualInput(e.target.value)}
          />
          <Button type="submit" variant="outline">
            Kirim
          </Button>
        </form>
      </div>

      <Button variant="ghost" asChild>
        <Link href="/dashboard/absensi">Kembali</Link>
      </Button>
    </div>
  );
}
