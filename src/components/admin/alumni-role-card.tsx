"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ShieldCheck, ShieldHalf, UserRound } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { EmailAutocompleteInput } from "@/components/admin/email-autocomplete-input";
import { ROLE_BADGE, type AlumniAccountInfo } from "@/lib/alumni-account-status";
import { ROLE_LABEL, type Role } from "@/lib/constants";
import { normalizeEmail } from "@/lib/email-suggest";
import {
  staffAccountFormSchema,
  type StaffAccountFormValues,
} from "@/lib/validators/alumni";

const ROLE_HINT: Record<Role, string> = {
  alumni: "Pengguna biasa - login ke Dashboard Alumni.",
  admin: "Mengelola sistem lewat Dashboard Admin (/admin).",
  super_admin: "Monitoring/read-only lewat Dashboard Monitoring (/monitoring).",
};

async function postRole(alumniId: string, body: Record<string, string>) {
  const res = await fetch(`/api/admin/alumni/${alumniId}/role`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = (await res.json().catch(() => ({}))) as { message?: string; error?: string };
  return { ok: res.ok, ...json };
}

/**
 * Role akun Alumni (hanya di area Admin). Aturan ditegakkan server +
 * database; kartu ini hanya memilih jalur:
 *  - sudah punya akun  -> konfirmasi, lalu ubah role akun yang sama
 *  - belum punya akun  -> form Email + Password (akun dibuat manual,
 *    langsung aktif, tanpa email undangan)
 */
export function AlumniRoleCard({
  alumniId,
  nama,
  account,
}: {
  alumniId: string;
  nama: string | null;
  account: AlumniAccountInfo;
}) {
  const router = useRouter();
  const role: Role = account.role ?? "alumni";
  const hasAccount = account.status !== "tanpa_akun";
  const [target, setTarget] = useState<Role | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const form = useForm<StaffAccountFormValues>({
    resolver: zodResolver(staffAccountFormSchema),
    defaultValues: { email: "", password: "", confirm: "" },
  });

  const needsAccount = target !== null && target !== "alumni" && !hasAccount;
  const targetLabel = target ? ROLE_LABEL[target] : "";

  function open(next: Role) {
    setError(null);
    form.reset({ email: "", password: "", confirm: "" });
    setTarget(next);
  }

  function close() {
    if (isSaving) return;
    setTarget(null);
  }

  async function submit(body: Record<string, string>) {
    if (!target) return;
    setIsSaving(true);
    setError(null);
    try {
      const result = await postRole(alumniId, { role: target, ...body });
      if (!result.ok) {
        setError(result.error ?? "Gagal mengubah role.");
        return;
      }
      toast.success(`Role diubah menjadi ${targetLabel}`, { description: result.message });
      setTarget(null);
      router.refresh();
    } catch {
      setError("Terjadi kesalahan jaringan, coba lagi.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Card>
      <CardContent className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="font-medium">Role</p>
          <Badge variant={ROLE_BADGE[role]}>{ROLE_LABEL[role]}</Badge>
        </div>
        <p className="text-sm text-muted-foreground">{ROLE_HINT[role]}</p>

        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          {role === "alumni" ? (
            <>
              <Button variant="outline" className="w-full sm:w-fit" onClick={() => open("admin")}>
                <ShieldCheck />
                Jadikan Admin
              </Button>
              <Button
                variant="outline"
                className="w-full sm:w-fit"
                onClick={() => open("super_admin")}
              >
                <ShieldHalf />
                Jadikan Super Admin
              </Button>
            </>
          ) : (
            <Button variant="outline" className="w-full sm:w-fit" onClick={() => open("alumni")}>
              <UserRound />
              Kembalikan ke Alumni
            </Button>
          )}
        </div>
        {role === "alumni" && !hasAccount ? (
          <p className="text-xs text-muted-foreground">
            Alumni ini belum punya akun - saat diangkat, Anda akan membuat email dan password
            akunnya.
          </p>
        ) : null}
      </CardContent>

      {/* Sudah punya akun (atau menurunkan role): konfirmasi saja. */}
      <AlertDialog open={target !== null && !needsAccount} onOpenChange={(o) => !o && close()}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {target === "alumni" ? "Kembalikan ke Alumni?" : `Jadikan ${targetLabel}?`}
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="flex flex-col gap-2">
                <p>
                  <span className="font-medium text-foreground">{nama || "(Tanpa nama)"}</span>{" "}
                  akan berubah dari {ROLE_LABEL[role]} menjadi {targetLabel}.
                </p>
                <p>
                  Akun login yang sama tetap dipakai - email dan password tidak berubah, data
                  Alumni tetap ada.
                </p>
                {target !== "alumni" && account.status !== "aktif" ? (
                  <p className="text-warning">
                    Akun ini belum membuat password, sehingga belum bisa login sampai password
                    dibuat.
                  </p>
                ) : null}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          {error ? (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          ) : null}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSaving}>Batal</AlertDialogCancel>
            <Button disabled={isSaving} onClick={() => submit({})}>
              {isSaving ? "Menyimpan..." : "Ya, Ubah Role"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Belum punya akun: buat akun manual (tanpa undangan). */}
      <Dialog open={needsAccount} onOpenChange={(o) => !o && close()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Jadikan {targetLabel}</DialogTitle>
            <DialogDescription>
              {nama || "Alumni ini"} belum punya akun. Buat akun login - akun langsung aktif dan
              dapat login dengan email dan password ini (tanpa email undangan).
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form
              className="flex flex-col gap-4"
              onSubmit={form.handleSubmit((v) =>
                submit({ email: normalizeEmail(v.email), password: v.password }),
              )}
            >
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <EmailAutocompleteInput
                        placeholder="contoh: ahmad212@gmail.com"
                        disabled={isSaving}
                        name={field.name}
                        ref={field.ref}
                        value={field.value}
                        onChange={field.onChange}
                        onBlur={field.onBlur}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        autoComplete="new-password"
                        disabled={isSaving}
                        {...field}
                      />
                    </FormControl>
                    <p className="text-xs text-muted-foreground">
                      Minimal 8 karakter, mengandung huruf dan angka.
                    </p>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="confirm"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Konfirmasi Password</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        autoComplete="new-password"
                        disabled={isSaving}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {error ? (
                <p role="alert" className="text-sm text-destructive">
                  {error}
                </p>
              ) : null}
              <DialogFooter>
                <Button type="button" variant="outline" disabled={isSaving} onClick={close}>
                  Batal
                </Button>
                <Button type="submit" disabled={isSaving}>
                  {isSaving ? "Membuat akun..." : `Buat Akun & Jadikan ${targetLabel}`}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
