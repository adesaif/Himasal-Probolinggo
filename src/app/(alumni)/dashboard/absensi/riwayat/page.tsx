import { redirect } from "next/navigation";

// Riwayat kehadiran sekarang bagian dari Dashboard Alumni (master view yang
// sama dengan Admin & Monitoring - termasuk kegiatan terlaksana yang tidak
// tercatat), jadi rute lama ini diarahkan ke sana.
export default function AlumniRiwayatAbsensiPage() {
  redirect("/dashboard#riwayat");
}
