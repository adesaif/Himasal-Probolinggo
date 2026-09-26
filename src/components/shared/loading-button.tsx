import { Loader2 } from "lucide-react";
import type { VariantProps } from "class-variance-authority";

import { Button, type buttonVariants } from "@/components/ui/button";

type LoadingButtonProps = React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
    isLoading?: boolean;
    loadingText?: string;
  };

/**
 * Button dengan state loading bawaan (spinner + disabled + teks berubah,
 * mis. "Menyimpan..."). Membungkus Button yang sudah ada - tidak mengganti
 * API-nya, jadi tetap bisa dipakai seperti Button biasa di tempat lain.
 */
export function LoadingButton({
  isLoading = false,
  loadingText,
  children,
  disabled,
  ...props
}: LoadingButtonProps) {
  return (
    <Button disabled={disabled || isLoading} {...props}>
      {isLoading ? <Loader2 className="animate-spin" aria-hidden="true" /> : null}
      {isLoading && loadingText ? loadingText : children}
    </Button>
  );
}
