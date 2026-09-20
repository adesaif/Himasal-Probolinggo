import { AttendanceEventList } from "@/components/admin/attendance-event-list";

export default function AdminAbsensiPage() {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Manajemen Absensi
        </h1>
        <p className="text-sm text-muted-foreground">
          Kelola dan pantau data kehadiran per kegiatan.
        </p>
      </div>
      <AttendanceEventList />
    </div>
  );
}
