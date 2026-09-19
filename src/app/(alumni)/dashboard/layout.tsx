import { DashboardShell } from "@/components/layout/dashboard-shell";

export default function AlumniLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <DashboardShell title="Alumni">{children}</DashboardShell>;
}
