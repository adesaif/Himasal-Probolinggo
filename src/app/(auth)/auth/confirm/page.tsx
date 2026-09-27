import type { Metadata } from "next";

import { AuthConfirm } from "@/components/auth/auth-confirm";

export const metadata: Metadata = { title: "Verifikasi Akun", robots: { index: false } };

export default function AuthConfirmPage() {
  return <AuthConfirm />;
}
