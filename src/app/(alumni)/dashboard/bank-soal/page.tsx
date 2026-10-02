import { redirect } from "next/navigation";

// Bank Soal belum tersedia untuk Alumni - rute lama diarahkan ke Beranda
// alih-alih menampilkan halaman placeholder.
export default function AlumniBankSoalPage() {
  redirect("/dashboard");
}
