import { redirect } from "next/navigation";

// Rute lama Fase 0 (placeholder). Daftar kegiatan alumni sudah tersedia di
// halaman publik /agenda (Fase 4) dan kartu kegiatan di /dashboard/absensi
// (Fase 5) - halaman ini tidak pernah ditautkan dari mana pun, jadi diarahkan
// ke /agenda daripada menampilkan "coming soon" yang sudah usang.
export default function AlumniAgendaPage() {
  redirect("/agenda");
}
