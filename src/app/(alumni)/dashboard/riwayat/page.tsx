import { redirect } from "next/navigation";

// Rute lama. Riwayat kehadiran ada di Beranda (AlumniMasterDetail) - langsung
// ke sana, tanpa redirect bertingkat.
export default function AlumniRiwayatPage() {
  redirect("/dashboard#riwayat");
}
