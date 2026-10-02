import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { changeAlumniRole, requireAdmin } from "@/lib/alumni-account";
import { normalizeEmail } from "@/lib/email-suggest";
import { alumniRoleBodySchema } from "@/lib/validators/alumni";

// POST /api/admin/alumni/:id/role - Admin mengubah role Alumni.
//  - body { role }                   : Alumni sudah punya akun -> ubah role
//                                      akun yang sama
//  - body { role, email, password }  : Alumni belum punya akun -> buat akun
//                                      manual (tanpa undangan), hubungkan,
//                                      lalu ubah role
// Otorisasi: sesi Admin (requireAdmin) DAN aturan di RPC database -
// Super Admin/Alumni selalu ditolak di kedua lapisan.
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const auth = await requireAdmin(supabase);
  if (!auth.ok) {
    const error = auth.status === 403 ? "Hanya Admin yang boleh mengubah role" : auth.error;
    return NextResponse.json({ error }, { status: auth.status });
  }

  const parsed = alumniRoleBodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Data tidak valid" },
      { status: 400 },
    );
  }

  try {
    const outcome = await changeAlumniRole(supabase, {
      alumniId: id,
      role: parsed.data.role,
      email: parsed.data.email ? normalizeEmail(parsed.data.email) : undefined,
      password: parsed.data.password,
    });
    return outcome.ok
      ? NextResponse.json({ message: outcome.message, accountCreated: outcome.accountCreated })
      : NextResponse.json({ error: outcome.error }, { status: outcome.status });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
