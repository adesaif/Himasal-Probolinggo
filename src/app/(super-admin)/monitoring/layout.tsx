import { AdminShell, type AdminNavGroup } from "@/components/layout/admin-shell";

// Super Admin = pusat MONITORING (read-only). Menu hanya fitur yang
// benar-benar ada - tidak ada aksi tulis di area ini.
const MONITORING_NAV: AdminNavGroup[] = [
  {
    label: "Monitoring",
    items: [
      { href: "/monitoring", label: "Ringkasan", icon: "dashboard" },
      { href: "/monitoring/alumni", label: "Alumni", icon: "users" },
      { href: "/monitoring/kegiatan", label: "Kegiatan & Absensi", icon: "calendar-check" },
    ],
  },
];

export default function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AdminShell groups={MONITORING_NAV} areaLabel="Monitoring" rootHref="/monitoring">
      {children}
    </AdminShell>
  );
}
