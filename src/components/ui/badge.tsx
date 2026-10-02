import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

// Satu-satunya sumber style pill status di seluruh aplikasi (Aktif/Nonaktif,
// Akan Datang/Selesai, Wajib Hadir, dll) - sebelumnya class Tailwind mentah
// (bg-green-100, bg-amber-100, dst) di-copy-paste identik di ~17 file.
// Varian di sini sengaja dipetakan ke token semantik globals.css
// (--success/--warning/--muted/--primary/--destructive), bukan warna
// Tailwind lepas, supaya ikut menyesuaikan tema otomatis.
const badgeVariants = cva(
  "inline-flex w-fit shrink-0 items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap",
  {
    variants: {
      variant: {
        primary: "bg-primary/10 text-primary",
        success: "bg-success/10 text-success",
        warning: "bg-warning/10 text-warning",
        destructive: "bg-destructive/10 text-destructive",
        neutral: "bg-muted text-muted-foreground",
      },
    },
    defaultVariants: {
      variant: "neutral",
    },
  },
);

function Badge({
  className,
  variant,
  asChild = false,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : "span";

  return (
    <Comp
      data-slot="badge"
      className={cn(badgeVariants({ variant, className }))}
      {...props}
    />
  );
}

export { Badge, badgeVariants };
