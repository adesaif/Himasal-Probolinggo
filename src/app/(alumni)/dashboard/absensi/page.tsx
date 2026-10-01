import { createClient } from "@/lib/supabase/server";
import { AlumniAbsensiView, type AbsensiEvent } from "@/components/alumni/absensi-view";

/** Awal hari ini (WIB) dalam ISO UTC. */
function startOfTodayJakartaIso(now: Date) {
  const day = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" }).format(now);
  return new Date(`${day}T00:00:00+07:00`).toISOString();
}

// Absensi = kegiatan yang SEDANG BERLANGSUNG dan AKAN DATANG. Kegiatan yang
// sudah selesai tidak tampil di sini (bukan "Belum Absen") - statusnya ada
// di Riwayat Kehadiran pada Beranda. Validasi QR tetap di submit_attendance.
export default async function AlumniAbsensiPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const now = new Date();
  const nowIso = now.toISOString();

  const [{ data: alumni }, { data: events, error }] = await Promise.all([
    supabase.from("alumni").select("id, status_keanggotaan").eq("profile_id", user.id).maybeSingle(),
    // Belum selesai: end_at >= sekarang, atau (tanpa end_at) dimulai hari ini
    // atau nanti. Urut dari yang paling dekat.
    supabase
      .from("events")
      .select("id, title, location, start_at, end_at, is_mandatory, attendance_closed_at")
      .eq("status", "published")
      .or(`end_at.gte.${nowIso},and(end_at.is.null,start_at.gte.${startOfTodayJakartaIso(now)})`)
      .order("start_at", { ascending: true })
      .limit(50),
  ]);

  const list = (events ?? []) as AbsensiEvent[];
  const ongoing = list.filter((e) => new Date(e.start_at) <= now);
  const upcoming = list.filter((e) => new Date(e.start_at) > now);

  const { data: myAttendance } =
    alumni && ongoing.length > 0
      ? await supabase
          .from("attendance_records")
          .select("event_id, status")
          .eq("alumni_id", alumni.id)
          .in(
            "event_id",
            ongoing.map((e) => e.id),
          )
      : { data: [] as { event_id: string; status: string }[] };
  const statusByEvent = new Map((myAttendance ?? []).map((a) => [a.event_id, a.status]));

  return (
    <AlumniAbsensiView
      membership={!alumni ? "none" : alumni.status_keanggotaan === "aktif" ? "aktif" : "nonaktif"}
      ongoing={ongoing}
      upcoming={upcoming}
      statusByEvent={statusByEvent}
      error={Boolean(error)}
    />
  );
}
