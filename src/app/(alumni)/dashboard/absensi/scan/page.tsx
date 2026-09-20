import { Suspense } from "react";

import { AttendanceScanClient } from "@/components/alumni/attendance-scan-client";
import { Skeleton } from "@/components/ui/skeleton";

export default function AlumniScanAbsensiPage() {
  return (
    <div className="mx-auto flex max-w-sm flex-col gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Scan Absensi</h1>
        <p className="text-sm text-muted-foreground">
          Pindai QR kegiatan untuk mencatat kehadiran.
        </p>
      </div>
      <Suspense fallback={<Skeleton className="h-80 w-full" />}>
        <AttendanceScanClient />
      </Suspense>
    </div>
  );
}
