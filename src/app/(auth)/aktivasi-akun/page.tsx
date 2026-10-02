import type { Metadata } from "next";

import { SetPasswordForm } from "@/components/auth/set-password-form";

export const metadata: Metadata = { title: "Aktivasi Akun", robots: { index: false } };

export default function AktivasiAkunPage() {
  return <SetPasswordForm />;
}
