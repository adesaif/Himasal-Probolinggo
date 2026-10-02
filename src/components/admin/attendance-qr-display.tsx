"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { createClient } from "@/lib/supabase/client";
import { buildAttendanceScanUrl } from "@/lib/attendance";

type ActiveToken = { token: string; expires_at: string } | null;

function formatCountdown(msRemaining: number) {
  if (msRemaining <= 0) return "Kedaluwarsa";
  const totalSeconds = Math.floor(msRemaining / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export function AttendanceQrDisplay({ eventId }: { eventId: string }) {
  const [activeToken, setActiveToken] = useState<ActiveToken>(null);
  const [qrImage, setQrImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setIsLoading(true);
      const supabase = createClient();
      const { data } = await supabase
        .from("event_qr_tokens")
        .select("token, expires_at")
        .eq("event_id", eventId)
        .is("revoked_at", null)
        .gt("expires_at", new Date().toISOString())
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (cancelled) return;
      setActiveToken(data ?? null);
      setIsLoading(false);
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [eventId]);

  useEffect(() => {
    if (!activeToken) return;

    let cancelled = false;
    QRCode.toDataURL(buildAttendanceScanUrl(activeToken.token), {
      width: 320,
      margin: 1,
    }).then((url) => {
      if (!cancelled) setQrImage(url);
    });
    return () => {
      cancelled = true;
    };
  }, [activeToken]);

  // Countdown tampilan - dicek ulang tiap detik di browser. Validitas
  // sesungguhnya tetap ditentukan server (expires_at) saat submit_attendance
  // dipanggil, bukan oleh timer di client ini.
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  async function generateQr() {
    setIsSubmitting(true);
    const supabase = createClient();
    const { data, error } = await supabase.rpc("admin_generate_event_qr", {
      p_event_id: eventId,
      p_ttl_minutes: 10,
    });
    setIsSubmitting(false);

    if (error) {
      toast.error("Gagal membuat QR", { description: error.message });
      return;
    }

    setActiveToken(data);
    toast.success("QR absensi berhasil dibuat");
  }

  async function revokeQr() {
    setIsSubmitting(true);
    const supabase = createClient();
    const { error } = await supabase.rpc("admin_revoke_event_qr", {
      p_event_id: eventId,
    });
    setIsSubmitting(false);

    if (error) {
      toast.error("Gagal menonaktifkan QR", { description: error.message });
      return;
    }

    setActiveToken(null);
    toast.success("QR absensi dinonaktifkan");
  }

  if (isLoading) {
    return <Skeleton className="mx-auto h-80 w-80" />;
  }

  const msRemaining = activeToken ? new Date(activeToken.expires_at).getTime() - now : 0;

  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-4 py-8">
        {activeToken && qrImage ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={qrImage}
              alt="QR absensi kegiatan"
              width={320}
              height={320}
              className="rounded-lg border"
            />
            <p className="text-sm text-muted-foreground">
              Berlaku {formatCountdown(msRemaining)} lagi
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              <Button onClick={generateQr} disabled={isSubmitting}>
                {isSubmitting ? "Memproses..." : "Perbarui QR"}
              </Button>
              <Button variant="outline" onClick={revokeQr} disabled={isSubmitting}>
                Nonaktifkan QR
              </Button>
            </div>
          </>
        ) : (
          <>
            <p className="text-center text-sm text-muted-foreground">
              Belum ada QR aktif untuk kegiatan ini. Buat QR untuk mulai menerima
              absensi.
            </p>
            <Button onClick={generateQr} disabled={isSubmitting}>
              {isSubmitting ? "Memproses..." : "Buat QR Absensi"}
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
