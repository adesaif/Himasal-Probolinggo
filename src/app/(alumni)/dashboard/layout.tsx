import { DashboardShell, type DashboardNavItem } from "@/components/layout/dashboard-shell";

// Menu utama member. Fitur yang belum tersedia (mis. Bank Soal) sengaja
// tidak ditampilkan sampai benar-benar ada.
const ALUMNI_NAV: DashboardNavItem[] = [
  { href: "/dashboard", label: "Beranda", icon: "home" },
  { href: "/dashboard/absensi", label: "Absensi", icon: "absensi" },
  { href: "/dashboard/profil", label: "Profil", icon: "profil" },
];

export default function AlumniLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <DashboardShell title="Dashboard Alumni" rootHref="/dashboard" navItems={ALUMNI_NAV}>
      {children}
    </DashboardShell>
  );
}
