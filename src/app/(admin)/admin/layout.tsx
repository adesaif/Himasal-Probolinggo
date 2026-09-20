import { DashboardShell } from "@/components/layout/dashboard-shell";

const ADMIN_NAV_ITEMS = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/alumni", label: "Alumni" },
  { href: "/admin/berita", label: "Berita" },
  { href: "/admin/agenda", label: "Agenda" },
  { href: "/admin/galeri", label: "Galeri" },
  { href: "/admin/absensi", label: "Absensi" },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <DashboardShell title="Admin" navItems={ADMIN_NAV_ITEMS}>
      {children}
    </DashboardShell>
  );
}
