import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AlumniDetailActions } from "@/components/admin/alumni-detail-actions";
import { AlumniAccountCard } from "@/components/admin/alumni-account-card";
import { AlumniRoleCard } from "@/components/admin/alumni-role-card";
import { AlumniMasterDetail } from "@/components/alumni/alumni-master-detail";
import { toAccountStatus, type AlumniAccountInfo } from "@/lib/alumni-account-status";
import { fetchAlumniActivityDetail, parseYearParam } from "@/lib/alumni-activity";
import { desaKelurahanLabel, fetchLokasiAlumni } from "@/lib/alumni-lokasi";

export default async function AdminAlumniDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tahun?: string }>;
}) {
  const { id } = await params;
  const { tahun } = await searchParams;
  const year = parseYearParam(tahun);
  const supabase = await createClient();

  // Master view (profil + kehadiran) dari RPC yang sama dengan Dashboard
  // Alumni & Monitoring; kolom mentah di bawah hanya untuk form Edit/Hapus.
  const [{ detail }, { data: alumni }, { count: jumlahAbsensi }, lokasi, { data: accountRows }] =
    await Promise.all([
      fetchAlumniActivityDetail(supabase, { alumniId: id, year }),
      supabase
        .from("alumni")
        .select(
          "id, profile_id, nama_lengkap, no_hp, tempat_lahir, tanggal_lahir, alamat, angkatan, kecamatan_id, desa_kelurahan_id, kecamatan:kecamatan_id(nama), desa:desa_kelurahan!alumni_desa_kelurahan_fkey(nama, jenis), profiles:profile_id(full_name, phone)",
        )
        .eq("id", id)
        .maybeSingle(),
      supabase
        .from("attendance_records")
        .select("id", { count: "exact", head: true })
        .eq("alumni_id", id),
      fetchLokasiAlumni(supabase),
      supabase.rpc("admin_alumni_account_status", { p_alumni_ids: [id] }),
    ]);

  if (!alumni || !detail) {
    notFound();
  }

  // Alumni dengan akun login: nama/HP diutamakan dari profiles (yang juga
  // diperbarui admin_save_alumni), fallback ke kolom alumni.
  const nama = alumni.profiles?.full_name?.trim() || alumni.nama_lengkap?.trim() || null;
  const noHp = alumni.profiles?.phone?.trim() || alumni.no_hp?.trim() || null;
  const kecamatanNama = alumni.kecamatan?.nama ?? null;
  const accountRow = accountRows?.[0];
  const account: AlumniAccountInfo = {
    status: toAccountStatus(accountRow?.account_status),
    email: accountRow?.email ?? null,
    role: accountRow?.role ?? null,
    isStaff: Boolean(accountRow?.role && accountRow.role !== "alumni"),
    invitedAt: accountRow?.invited_at ?? null,
    lastSignInAt: accountRow?.last_sign_in_at ?? null,
  };
  const desa = alumni.desa ?? null;
  const alamatRingkas = kecamatanNama
    ? desa
      ? `${desaKelurahanLabel(desa.jenis)} ${desa.nama}, Kec. ${kecamatanNama}`
      : `Kec. ${kecamatanNama}`
    : null;

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-4">
      <Button variant="ghost" size="sm" asChild className="w-fit">
        <Link href="/admin/alumni">
          <ArrowLeft />
          Kembali ke Data Alumni
        </Link>
      </Button>

      <AlumniMasterDetail
        detail={detail}
        yearHref={(y) => `/admin/alumni/${id}?tahun=${y}`}
        actions={
          <AlumniDetailActions
            alumniId={alumni.id}
            lokasi={lokasi}
            account={account}
            initialValues={{
              full_name: nama ?? "",
              email: "",
              kecamatan_id: alumni.kecamatan_id,
              desa_kelurahan_id: alumni.desa_kelurahan_id,
              phone: noHp ?? "",
              tempat_lahir: alumni.tempat_lahir ?? "",
              tanggal_lahir: alumni.tanggal_lahir ?? "",
              angkatan: alumni.angkatan,
            }}
            deleteTarget={{
              id: alumni.id,
              nama,
              alamat: alamatRingkas,
              angkatan: alumni.angkatan,
              jumlahAbsensi: jumlahAbsensi ?? 0,
              hasAccount: alumni.profile_id !== null,
              staffRole: account.isStaff ? account.role : null,
            }}
          />
        }
      >
        {!kecamatanNama && alumni.alamat?.trim() ? (
          // Data lama (sebelum struktur Kecamatan -> Desa/Kelurahan) tidak
          // dipetakan otomatis - ditampilkan apa adanya supaya Admin bisa
          // memperbaikinya lewat Edit, tanpa mengarang alamat baru.
          <Card>
            <CardContent className="flex flex-col gap-1 text-sm">
              <p className="font-medium">Alamat lama perlu dipetakan</p>
              <p className="text-muted-foreground">
                Pilih Kecamatan dan Desa/Kelurahan yang sesuai lewat tombol Edit.
              </p>
            </CardContent>
          </Card>
        ) : null}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <AlumniAccountCard alumniId={alumni.id} account={account} />
          <AlumniRoleCard alumniId={alumni.id} nama={nama} account={account} />
        </div>
      </AlumniMasterDetail>
    </div>
  );
}
