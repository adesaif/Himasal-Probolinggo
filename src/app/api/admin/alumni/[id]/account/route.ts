import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import {
  activationRedirectUrl,
  provisionAlumniAccount,
  requireAdmin,
  resendAlumniInvitation,
} from "@/lib/alumni-account";
import { normalizeEmail } from "@/lib/email-suggest";
import { alumniAccountBodySchema } from "@/lib/validators/alumni";

// POST /api/admin/alumni/:id/account
//  - body { email }: buat akun untuk alumni yang belum punya akun
//  - body {}      : kirim ulang undangan/aktivasi untuk akun yang belum aktif
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const auth = await requireAdmin(supabase);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const parsed = alumniAccountBodySchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Data tidak valid" },
      { status: 400 },
    );
  }

  const redirectTo = activationRedirectUrl(request);

  try {
    if (parsed.data.email) {
      const { data: alumni } = await supabase
        .from("alumni")
        .select("id, profile_id, nama_lengkap")
        .eq("id", id)
        .maybeSingle();
      if (!alumni) return NextResponse.json({ error: "Data alumni tidak ditemukan" }, { status: 404 });
      if (alumni.profile_id) {
        return NextResponse.json(
          { error: "Alumni ini sudah punya akun. Gunakan Kirim Ulang Undangan." },
          { status: 409 },
        );
      }

      const outcome = await provisionAlumniAccount(supabase, {
        alumniId: id,
        email: normalizeEmail(parsed.data.email),
        fullName: alumni.nama_lengkap ?? "",
        redirectTo,
      });
      return outcome.ok
        ? NextResponse.json({ message: outcome.message })
        : NextResponse.json({ error: outcome.error }, { status: outcome.status });
    }

    const outcome = await resendAlumniInvitation(supabase, id, redirectTo);
    return outcome.ok
      ? NextResponse.json({ message: outcome.message })
      : NextResponse.json({ error: outcome.error }, { status: outcome.status });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
