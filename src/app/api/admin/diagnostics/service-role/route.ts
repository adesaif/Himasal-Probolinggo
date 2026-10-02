import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/alumni-account";
import { collectServiceRoleDiagnostics } from "@/lib/diagnostics/service-role-diagnostics";

// DIAGNOSTIK SEMENTARA - GET /api/admin/diagnostics/service-role.
// Hanya Admin (requireAdmin -> is_admin()); Super Admin, Alumni, dan anon
// ditolak. Respons hanya boolean - tidak pernah berisi nilai secret.
// Hapus file ini dan src/lib/diagnostics/ setelah diagnosis selesai.
export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store" };

export async function GET() {
  const supabase = await createClient();
  const auth = await requireAdmin(supabase);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status, headers: NO_STORE });
  }

  return NextResponse.json(await collectServiceRoleDiagnostics(), { headers: NO_STORE });
}
