import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EditAlumniDialog } from "@/components/admin/edit-alumni-dialog";
import { AlumniStatusToggle } from "@/components/admin/alumni-status-toggle";

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-medium">{value}</p>
    </div>
  );
}

export default async function AdminAlumniDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: alumni }, { data: wilayahList }] = await Promise.all([
    supabase
      .from("alumni")
      .select(
        "id, tempat_lahir, tanggal_lahir, alamat, angkatan, status_keanggotaan, wilayah_id, wilayah:wilayah_id(nama), profiles:profile_id(full_name, phone)",
      )
      .eq("id", id)
      .single(),
    supabase.from("wilayah").select("id, nama").eq("is_active", true).order("nama"),
  ]);

  if (!alumni) {
    notFound();
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4">
      <Button variant="ghost" size="sm" asChild className="w-fit">
        <Link href="/admin/alumni">
          <ArrowLeft />
          Kembali ke Data Alumni
        </Link>
      </Button>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">
          {alumni.profiles?.full_name || "(Belum diisi)"}
        </h1>
        <div className="flex gap-2">
          <EditAlumniDialog
            alumniId={alumni.id}
            wilayahList={wilayahList ?? []}
            initialValues={{
              full_name: alumni.profiles?.full_name ?? "",
              phone: alumni.profiles?.phone ?? "",
              tempat_lahir: alumni.tempat_lahir ?? "",
              tanggal_lahir: alumni.tanggal_lahir ?? "",
              alamat: alumni.alamat ?? "",
              wilayah_id: alumni.wilayah_id ?? "",
              angkatan: alumni.angkatan?.toString() ?? "",
            }}
          />
          <AlumniStatusToggle
            alumniId={alumni.id}
            currentStatus={alumni.status_keanggotaan}
          />
        </div>
      </div>

      <Card>
        <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <InfoRow
            label="Status"
            value={alumni.status_keanggotaan === "aktif" ? "Aktif" : "Nonaktif"}
          />
          <InfoRow label="Nomor HP" value={alumni.profiles?.phone || "-"} />
          <InfoRow label="Wilayah" value={alumni.wilayah?.nama ?? "-"} />
          <InfoRow label="Angkatan" value={alumni.angkatan?.toString() ?? "-"} />
          <InfoRow label="Tempat Lahir" value={alumni.tempat_lahir || "-"} />
          <InfoRow label="Tanggal Lahir" value={alumni.tanggal_lahir || "-"} />
          <div className="sm:col-span-2">
            <InfoRow label="Alamat" value={alumni.alamat || "-"} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
