"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Mail, Send } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AlumniManualAccountDialog } from "@/components/admin/alumni-manual-account-dialog";
import {
  ACCOUNT_STATUS_BADGE,
  ACCOUNT_STATUS_LABEL,
  canResendInvitation,
  type AlumniAccountInfo,
} from "@/lib/alumni-account-status";
import { ROLE_HOME_ROUTE, ROLE_LABEL } from "@/lib/constants";
import { formatDateID } from "@/lib/format-date";

const STATUS_HINT = {
  tanpa_akun:
    "Alumni ini belum punya akun login. Buat akun manual (email + password awal, langsung aktif), atau isi email lewat tombol Edit untuk mengirim undangan.",
  undangan_terkirim: "Undangan sudah dikirim, tetapi link aktivasi belum dibuka.",
  menunggu_password: "Email sudah terverifikasi lewat link undangan, tetapi password belum dibuat.",
  aktif: "Akun aktif - Alumni dapat login ke Dashboard Alumni.",
} as const;

/**
 * Status akun login alumni + Buat Akun Manual (belum punya akun) + Kirim
 * Ulang Undangan (undangan belum diaktifkan; tanpa akun kedua).
 */
export function AlumniAccountCard({
  alumniId,
  nama,
  account,
}: {
  alumniId: string;
  nama: string | null;
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
          <Badge variant={ACCOUNT_STATUS_BADGE[account.status]}>
            {ACCOUNT_STATUS_LABEL[account.status]}
          </Badge>
        </div>
        {account.email ? (
          <p className="flex min-w-0 items-center gap-2 text-sm">
            <Mail className="size-4 shrink-0 text-muted-foreground" />
            <span className="break-all">{account.email}</span>
          </p>
        ) : null}
        <p className="text-sm text-muted-foreground">
          {account.isStaff && account.role
            ? `Akun ini ber-role ${ROLE_LABEL[account.role]} - login ke ${ROLE_HOME_ROUTE[account.role]}. Email & password dikelola pemilik akun; role diatur di kartu Role.`
            : STATUS_HINT[account.status]}
        </p>
        {!account.isStaff && (account.invitedAt || account.lastSignInAt) ? (
          <p className="text-xs text-muted-foreground">
            {account.invitedAt ? `Undangan terakhir: ${formatDateID(account.invitedAt)}` : null}
            {account.invitedAt && account.lastSignInAt ? " · " : null}
            {account.lastSignInAt ? `Login terakhir: ${formatDateID(account.lastSignInAt)}` : null}
          </p>
        ) : null}
        {!account.isStaff && account.status === "tanpa_akun" ? (
          <AlumniManualAccountDialog alumniId={alumniId} nama={nama} />
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
