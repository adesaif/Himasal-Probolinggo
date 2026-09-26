import { AdminShell, type AdminNavGroup } from "@/components/layout/admin-shell";
import { createClient } from "@/lib/supabase/server";
import { TOPIC_SELECT_COLUMNS, topicLabel } from "@/lib/topics";

// Sidebar Admin SELALU menampilkan semua modul apa pun status aktif topik
// (Admin harus tetap bisa mengelola konten walau topiknya disembunyikan
// dari publik) - hanya labelnya yang dinamis mengikuti site_topics. Grouping
// di sini mengikuti struktur data nyata (site_topics/topic_content), BUKAN
// /monitoring - itu area Super Admin terpisah (role berbeda, lihat
// proxy.ts), admin role tidak pernah bisa membukanya.
//
// Galeri/Profil/Struktur/Masayikh SENGAJA tidak lagi jadi item sidebar di
// sini - halamannya (/admin/galeri, /admin/konten/{profil,struktur,
// masayikh}) tetap ada dan tetap berfungsi persis seperti sebelumnya,
// hanya dijangkau lewat "Kelola Konten" pada baris topiknya masing-masing
// di Topik & Navigasi (lihat SYSTEM_TOPIC_MANAGE_HREF di topic-list.tsx),
// bukan dihapus. Agenda TIDAK ikut dipindah (tetap item sidebar sendiri)
// karena tidak diminta.
//
// Ikon dirujuk lewat key string (bukan import komponen lucide-react
// langsung) - AdminShell adalah Client Component, dan referensi fungsi
// komponen tidak bisa dikirim sebagai prop lewat batas Server/Client
// Next.js (RSC serialization). Key di-resolve ke komponen asli di dalam
// admin-shell.tsx.
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: topics } = await supabase
    .from("site_topics")
    .select(TOPIC_SELECT_COLUMNS);

  const groups: AdminNavGroup[] = [
    {
      label: "Overview",
      items: [{ href: "/admin", label: "Dashboard", icon: "dashboard" }],
    },
    {
      label: "Alumni",
      items: [{ href: "/admin/alumni", label: "Alumni", icon: "users" }],
    },
    {
      label: "Konten",
      items: [
        { href: "/admin/berita", label: topicLabel(topics, "berita", "Berita"), icon: "newspaper" },
        { href: "/admin/agenda", label: topicLabel(topics, "agenda", "Agenda"), icon: "calendar" },
        { href: "/admin/konten/topik", label: "Topik & Navigasi", icon: "list-tree" },
      ],
    },
    {
      label: "Operasional",
      items: [
        { href: "/admin/absensi", label: "Absensi", icon: "qr-code" },
        // badge "Segera" - kedua modul ini rute/nav-nya sudah ada tapi
        // belum dibangun (PagePlaceholder, tanpa tabel/CRUD) - label ini
        // supaya Admin tahu dari sidebar saja tanpa perlu klik dulu.
        { href: "/admin/bank-soal", label: "Bank Soal", icon: "book-open", badge: "Segera" },
        { href: "/admin/laporan", label: "Laporan", icon: "file-bar-chart", badge: "Segera" },
      ],
    },
    {
      label: "Sistem",
      items: [
        { href: "/admin/konten/pengaturan", label: "Pengaturan Situs", icon: "settings" },
      ],
    },
  ];

  return <AdminShell groups={groups}>{children}</AdminShell>;
}
