import { DashboardShell } from "@/components/layout/dashboard-shell";
import { createClient } from "@/lib/supabase/server";
import { TOPIC_SELECT_COLUMNS, topicLabel } from "@/lib/topics";

// Sidebar Admin SELALU menampilkan semua modul apa pun status aktif topik
// (Admin harus tetap bisa mengelola konten walau topiknya disembunyikan
// dari publik) - hanya labelnya yang dinamis mengikuti site_topics.
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: topics } = await supabase
    .from("site_topics")
    .select(TOPIC_SELECT_COLUMNS);

  const navItems = [
    { href: "/admin", label: "Dashboard" },
    { href: "/admin/alumni", label: "Alumni" },
    { href: "/admin/berita", label: topicLabel(topics, "berita", "Berita") },
    { href: "/admin/agenda", label: topicLabel(topics, "agenda", "Agenda") },
    { href: "/admin/galeri", label: topicLabel(topics, "galeri", "Galeri") },
    { href: "/admin/absensi", label: "Absensi" },
    { href: "/admin/konten", label: topicLabel(topics, "konten", "Konten") },
  ];

  return (
    <DashboardShell title="Admin" navItems={navItems}>
      {children}
    </DashboardShell>
  );
}
