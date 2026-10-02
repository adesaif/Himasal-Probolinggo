import { AttendanceEventList } from "@/components/admin/attendance-event-list";
import { AdminPageHeader } from "@/components/admin/admin-page-header";

export default function AdminAbsensiPage() {
  return (
    <div className="flex flex-col gap-4">
      <AdminPageHeader
        title="Manajemen Absensi"
        description="Kelola dan pantau data kehadiran per kegiatan."
      />
      <AttendanceEventList />
    </div>
  );
}
