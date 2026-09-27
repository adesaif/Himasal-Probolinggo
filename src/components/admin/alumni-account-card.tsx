"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Mail, Send } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  ACCOUNT_STATUS_BADGE,
  ACCOUNT_STATUS_LABEL,
  canResendInvitation,
  type AlumniAccountInfo,
} from "@/lib/alumni-account-status";
import { formatDateID } from "@/lib/format-date";

const STATUS_HINT = {
  tanpa_akun: "Alumni ini belum punya akun login. Isi email lewat tombol Edit untuk membuat akun dan mengirim undangan.",
  undangan_terkirim: "Undangan sudah dikirim, tetapi link aktivasi belum dibuka.",
  menunggu_password: "Email sudah terverifikasi lewat link undangan, tetapi password belum dibuat.",
  aktif: "Alumni sudah membuat password dan dapat login ke Dashboard Alumni.",
} as const;

/** Status akun login alumni + Kirim Ulang Undangan (tanpa akun kedua). */
export function AlumniAccountCard({
  alumniId,
  account,
}: {
  alumniId: string;
  account: AlumniAccountInfo;
}) {
  const router = useRouter();
  const [isSending, setIsSending] = useState(false);

  async function resend() {
    setIsSending(true);
    try {
      const res = await fetch(`/api/admin/alumni/${alumniId}/account`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      });
      const body = (await res.json().catch(() => ({}))) as { message?: string; error?: string };
      if (!res.ok) {
        toast.error("Gagal mengirim ulang undangan", { description: body.error });
        return;
      }
      toast.success("Undangan dikirim ulang", { description: body.message });
      router.refresh();
    } catch {
      toast.error("Terjadi kesalahan jaringan, coba lagi.");
    } finally {
      setIsSending(false);
    }
  }

  return (
    <Card>
      <CardContent className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="font-medium">Akun Login</p>
          <Badge variant={account.isStaff ? "primary" : ACCOUNT_STATUS_BADGE[account.status]}>
            {account.isStaff ? "Akun Admin/Super Admin" : ACCOUNT_STATUS_LABEL[account.status]}
          </Badge>
        </div>
        {account.email ? (
          <p className="flex min-w-0 items-center gap-2 text-sm">
            <Mail className="size-4 shrink-0 text-muted-foreground" />
            <span className="break-all">{account.email}</span>
          </p>
        ) : null}
        <p className="text-sm text-muted-foreground">
          {account.isStaff
            ? "Akun ini milik Admin/Super Admin dan dikelola terpisah - tidak diubah lewat modul Alumni."
            : STATUS_HINT[account.status]}
        </p>
        {!account.isStaff && (account.invitedAt || account.lastSignInAt) ? (
          <p className="text-xs text-muted-foreground">
            {account.invitedAt ? `Undangan terakhir: ${formatDateID(account.invitedAt)}` : null}
            {account.invitedAt && account.lastSignInAt ? " · " : null}
            {account.lastSignInAt ? `Login terakhir: ${formatDateID(account.lastSignInAt)}` : null}
          </p>
        ) : null}
        {canResendInvitation(account) ? (
          <Button variant="outline" className="w-full sm:w-fit" disabled={isSending} onClick={resend}>
            <Send />
            {isSending ? "Mengirim..." : "Kirim Ulang Undangan"}
          </Button>
        ) : null}
      </CardContent>
    </Card>
  );
}
