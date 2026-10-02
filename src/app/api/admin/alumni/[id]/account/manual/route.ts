import { NextResponse } from "next/server";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import { createAlumniAccountManual, requireAdmin } from "@/lib/alumni-account";
import { normalizeEmail } from "@/lib/email-suggest";
import { alumniManualAccountBodySchema } from "@/lib/validators/alumni";

// POST /api/admin/alumni/:id/account/manual - body { email, password }.
// Buat akun login untuk Alumni yang BELUM punya akun, langsung aktif tanpa
// email undangan. Otorisasi: sesi Admin (requireAdmin -> is_admin()) dan
// aturan RPC admin_link_alumni_account; Super Admin, Alumni, dan anon
// ditolak. Password tidak pernah dikembalikan atau di-log.
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const auth = await requireAdmin(supabase);
  if (!auth.ok) {
    const error = auth.status === 403 ? "Hanya Admin yang boleh membuat akun alumni" : auth.error;
    return NextResponse.json({ error }, { status: auth.status });
  }

  if (!z.string().uuid().safeParse(id).success) {
    return NextResponse.json({ error: "Data alumni tidak ditemukan." }, { status: 404 });
  }

  const parsed = alumniManualAccountBodySchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Data tidak valid" },
      { status: 400 },
    );
  }

  try {
    const outcome = await createAlumniAccountManual(supabase, {
      alumniId: id,
      email: normalizeEmail(parsed.data.email),
      password: parsed.data.password,
    });
    return outcome.ok
      ? NextResponse.json({ message: outcome.message }, { status: 201 })
      : NextResponse.json({ error: outcome.error }, { status: outcome.status });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
