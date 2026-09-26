import { NextResponse } from "next/server";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// Body sudah divalidasi ulang di sini (bukan cuma di form client) karena
// route ini yang benar-benar memegang service-role key.
const bodySchema = z.object({
  full_name: z.string().trim().min(1),
  email: z.string().trim().email(),
  phone: z.string().trim().optional(),
  tempat_lahir: z.string().trim().optional(),
  tanggal_lahir: z.string().trim().optional(),
  alamat: z.string().trim().optional(),
  wilayah_id: z.string().trim().optional(),
  angkatan: z.number().int().min(1900).max(2100).optional(),
});

export async function POST(request: Request) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Belum login" }, { status: 401 });
  }

  // Otorisasi ditegakkan server-side lewat RPC is_admin() (membaca role
  // dari database berdasarkan sesi yang sedang login) - BUKAN dari role
  // yang dikirim/diklaim client.
  const { data: isAdmin, error: isAdminError } = await supabase.rpc("is_admin");
  if (isAdminError || !isAdmin) {
    return NextResponse.json(
      { error: "Hanya Admin yang boleh membuat akun alumni" },
      { status: 403 },
    );
  }

  const json = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Data tidak valid", details: parsed.error.flatten() },
      { status: 400 },
    );
  }
  const input = parsed.data;

  // Service-role client hanya dipakai di sini, hanya untuk memanggil
  // Supabase Auth Admin API (invite). Tidak pernah dikirim ke client.
  const admin = createAdminClient();

  const { data: inviteData, error: inviteError } =
    await admin.auth.admin.inviteUserByEmail(input.email, {
      data: { full_name: input.full_name },
    });

  if (inviteError || !inviteData.user) {
    return NextResponse.json(
      {
        error:
          inviteError?.message ??
          "Gagal mengundang akun alumni. Periksa konfigurasi email di Supabase Auth.",
      },
      { status: 502 },
    );
  }

  // Trigger handle_new_user (Fase 1) sudah otomatis membuat baris
  // profiles + alumni kosong untuk user baru ini.
  const { data: alumniRow, error: findError } = await admin
    .from("alumni")
    .select("id")
    .eq("profile_id", inviteData.user.id)
    .single();

  if (findError || !alumniRow) {
    return NextResponse.json(
      {
        warning:
          "Akun berhasil diundang, tapi baris data alumni belum ditemukan. Coba lengkapi lewat halaman edit setelah refresh.",
      },
      { status: 207 },
    );
  }

  const { error: updateError } = await supabase.rpc("admin_update_alumni", {
    p_alumni_id: alumniRow.id,
    p_full_name: input.full_name,
    p_phone: input.phone || undefined,
    p_tempat_lahir: input.tempat_lahir || undefined,
    p_tanggal_lahir: input.tanggal_lahir || undefined,
    p_alamat: input.alamat || undefined,
    p_wilayah_id: input.wilayah_id || undefined,
    p_angkatan: input.angkatan ?? undefined,
  });

  if (updateError) {
    return NextResponse.json(
      {
        warning: `Akun berhasil diundang, tapi gagal menyimpan sebagian biodata: ${updateError.message}`,
        alumniId: alumniRow.id,
      },
      { status: 207 },
    );
  }

  return NextResponse.json({ alumniId: alumniRow.id }, { status: 201 });
}
