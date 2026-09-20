"use client";

import { useEffect, useRef, useState } from "react";
import QrScanner from "qr-scanner";

import { Button } from "@/components/ui/button";

// qr-scanner >=1.4 membundel worker-nya sendiri lewat dynamic import
// relatif ke modulnya - tidak perlu lagi mengatur WORKER_PATH manual atau
// menyalin file worker ke public/.

type ScannerState = "idle" | "starting" | "scanning" | "no-camera" | "denied";

export function QrCodeScanner({
  onDecode,
}: {
  onDecode: (value: string) => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const scannerRef = useRef<QrScanner | null>(null);
  const [state, setState] = useState<ScannerState>("idle");

  function stop() {
    scannerRef.current?.stop();
    scannerRef.current?.destroy();
    scannerRef.current = null;
    setState("idle");
  }

  async function start() {
    if (!videoRef.current) return;
    setState("starting");

    try {
      const hasCamera = await QrScanner.hasCamera();
      if (!hasCamera) {
        setState("no-camera");
        return;
      }

      const scanner = new QrScanner(
        videoRef.current,
        (result) => {
          const value = typeof result === "string" ? result : result.data;
          stop();
          onDecode(value);
        },
        {
          highlightScanRegion: true,
          highlightCodeOutline: true,
          maxScansPerSecond: 5,
          preferredCamera: "environment",
        },
      );
      scannerRef.current = scanner;
      await scanner.start();
      setState("scanning");
    } catch {
      setState("denied");
    }
  }

  // Kamera hanya diminta saat tombol "Mulai Scan" ditekan (bukan otomatis
  // saat halaman dibuka), dan selalu dihentikan saat komponen unmount.
  useEffect(() => stop, []);

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative aspect-square w-full max-w-sm overflow-hidden rounded-lg bg-black">
        <video
          ref={videoRef}
          className="size-full object-cover"
          muted
          playsInline
        />
        {state !== "scanning" ? (
          <div className="absolute inset-0 flex items-center justify-center bg-black/70 p-4 text-center text-sm text-white">
            {state === "idle" && "Tekan tombol di bawah untuk mulai memindai QR."}
            {state === "starting" && "Membuka kamera..."}
            {state === "no-camera" &&
              "Kamera tidak ditemukan di perangkat ini. Gunakan input manual di bawah."}
            {state === "denied" &&
              "Akses kamera ditolak atau gagal dibuka. Izinkan kamera di pengaturan browser, atau gunakan input manual di bawah."}
          </div>
        ) : null}
      </div>

      {state === "scanning" ? (
        <Button type="button" variant="outline" onClick={stop}>
          Hentikan Kamera
        </Button>
      ) : (
        <Button type="button" onClick={start} disabled={state === "starting"}>
          {state === "starting" ? "Membuka Kamera..." : "Mulai Scan"}
        </Button>
      )}
    </div>
  );
}
