import { DashboardShell } from "@/components/layout/dashboard-shell";

const SUPER_ADMIN_NAV_ITEMS = [
  { href: "/monitoring", label: "Dashboard" },
  { href: "/monitoring/laporan", label: "Laporan" },
];

export default function SuperAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <DashboardShell title="Super Admin (Read-only)" navItems={SUPER_ADMIN_NAV_ITEMS}>
      {children}
    </DashboardShell>
  );
}
