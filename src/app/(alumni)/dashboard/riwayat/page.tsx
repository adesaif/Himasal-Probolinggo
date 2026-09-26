import { redirect } from "next/navigation";

// Rute lama Fase 0. Absensi (termasuk riwayat) sekarang dikelompokkan di
// bawah /dashboard/absensi sejak Fase 5, sesuai struktur yang diminta.
export default function AlumniRiwayatPage() {
  redirect("/dashboard/absensi/riwayat");
}
