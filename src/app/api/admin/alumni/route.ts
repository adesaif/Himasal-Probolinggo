import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import {
  activationRedirectUrl,
  checkEmailAvailable,
  provisionAlumniAccount,
  requireAdmin,
} from "@/lib/alumni-account";
import { normalizeEmail } from "@/lib/email-suggest";
import { alumniCreateBodySchema } from "@/lib/validators/alumni";

// POST /api/admin/alumni - Tambah Alumni + buat akun login + kirim
// undangan. Data alumni disimpan lewat RPC admin_save_alumni (sesi Admin);
// hanya pembuatan akun/undangan yang memakai service-role, server-side.
export async function POST(request: Request) {
  const supabase = await createClient();
  const auth = await requireAdmin(supabase);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const parsed = alumniCreateBodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Data tidak valid" },
      { status: 400 },
    );
  }
  const input = parsed.data;
  const email = normalizeEmail(input.email);

  // Tolak email bentrok sebelum menyimpan apa pun.
  const conflict = await checkEmailAvailable(supabase, email);
  if (conflict && !conflict.ok) {
    return NextResponse.json(
      { error: conflict.error, existingAlumniId: conflict.existingAlumniId },
      { status: conflict.status },
    );
  }

  const { data: saved, error: saveError } = await supabase.rpc("admin_save_alumni", {
    p_nama_lengkap: input.full_name,
    p_no_hp: input.phone || undefined,
    p_tempat_lahir: input.tempat_lahir || undefined,
    p_tanggal_lahir: input.tanggal_lahir || undefined,
    p_kecamatan_id: input.kecamatan_id ?? undefined,
    p_desa_kelurahan_id: input.desa_kelurahan_id ?? undefined,
    p_angkatan: input.angkatan ?? undefined,
  });
  if (saveError || !saved) {
    return NextResponse.json(
      { error: saveError?.message ?? "Gagal menyimpan data alumni" },
      { status: 400 },
    );
  }

  let outcome;
  try {
    outcome = await provisionAlumniAccount(supabase, {
      alumniId: saved.id,
      email,
      fullName: input.full_name,
      redirectTo: activationRedirectUrl(request),
    });
  } catch (e) {
    outcome = { ok: false as const, status: 500, error: (e as Error).message };
  }

  if (!outcome.ok) {
    // Data alumni sudah tersimpan; akun bisa dibuat/dikirim ulang dari
    // halaman detail tanpa mengisi ulang form.
    return NextResponse.json(
      { alumniId: saved.id, warning: `Data alumni tersimpan, tetapi akun belum siap: ${outcome.error}` },
      { status: 207 },
    );
  }

  return NextResponse.json({ alumniId: saved.id, message: outcome.message }, { status: 201 });
}
