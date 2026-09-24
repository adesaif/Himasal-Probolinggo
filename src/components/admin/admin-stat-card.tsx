import type { LucideIcon } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

/**
 * KPI card khusus Dashboard Admin - terpisah dari StatCard generik (dipakai
 * /monitoring dan attendance-participant-list) supaya redesign ini tidak
 * menyentuh area lain. `emphasis` dipakai restrained - hanya untuk 1-2 kartu
 * paling penting, bukan semua kartu berwarna (lihat brief redesign).
 */
export function AdminStatCard({
  label,
  value,
  icon: Icon,
  emphasis = false,
  supporting,
}: {
  label: string;
  value: string | number;
  icon: LucideIcon;
  emphasis?: boolean;
  supporting?: string;
}) {
  return (
    <Card
      className={cn(
        "gap-3 py-5",
        emphasis && "border-primary/30 bg-primary/[0.04]",
      )}
    >
      <CardContent className="flex items-start justify-between gap-2 px-4 sm:px-5">
        <div className="flex min-w-0 flex-col gap-1.5">
          <p className="text-xs text-muted-foreground sm:text-sm">{label}</p>
          <p className="text-2xl font-semibold tracking-tight tabular-nums sm:text-3xl">{value}</p>
          {supporting ? (
            <p className="text-xs text-muted-foreground">{supporting}</p>
          ) : null}
        </div>
        <span
          aria-hidden="true"
          className={cn(
            "flex size-8 shrink-0 items-center justify-center rounded-lg sm:size-9",
            emphasis ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground",
          )}
        >
          <Icon className="size-4 sm:size-[18px]" />
        </span>
      </CardContent>
    </Card>
  );
}
