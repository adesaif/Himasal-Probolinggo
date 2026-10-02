"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

import { Input } from "@/components/ui/input";

/** Input password dengan tombol tampilkan/sembunyikan (dipakai form akun). */
export function PasswordInput({
  autoComplete,
  disabled,
  ...field
}: React.ComponentProps<"input"> & { autoComplete: string }) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="relative">
      <Input
        {...field}
        type={visible ? "text" : "password"}
        autoComplete={autoComplete}
        disabled={disabled}
        className="pr-11"
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        disabled={disabled}
        aria-label={visible ? "Sembunyikan password" : "Tampilkan password"}
        aria-pressed={visible}
        className="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-md text-muted-foreground hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none disabled:opacity-50"
      >
        {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
      </button>
    </div>
  );
}
