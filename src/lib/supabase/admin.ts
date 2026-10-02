import "server-only";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database.types";

const SERVICE_ROLE_KEY_NAME = "SUPABASE_SERVICE_ROLE_KEY";

/**
 * Supabase service-role key, SERVER-ONLY. Dibaca langsung dari binding
 * Cloudflare Worker (Worker Secret, berupa string) lewat
 * getCloudflareContext().env - tidak bergantung pada process.env yang hanya
 * diisi tidak langsung oleh OpenNext. Fallback ke process.env untuk
 * `next dev`/lokal. Nilainya tidak pernah di-log atau dikembalikan ke client.
 */
export function getServiceRoleKey(): string | null {
  let fromBinding: unknown;
  try {
    const env = getCloudflareContext().env as unknown as Record<string, unknown>;
    fromBinding = env[SERVICE_ROLE_KEY_NAME];
  } catch {
    // Di luar request Worker (mis. next dev tanpa konteks Cloudflare).
    fromBinding = undefined;
  }
  if (typeof fromBinding === "string" && fromBinding !== "") return fromBinding;

  const fromProcess = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return fromProcess ? fromProcess : null;
}

// SERVICE-ROLE CLIENT - bypasses RLS entirely. Only ever import this from
// server-only code (Route Handlers, Server Actions). The `server-only`
// import above makes the build fail if this file is ever pulled into a
// client bundle. Never expose SUPABASE_SERVICE_ROLE_KEY to the browser.
export function createAdminClient() {
  const serviceRoleKey = getServiceRoleKey();
  if (!serviceRoleKey) {
    throw new Error(`${SERVICE_ROLE_KEY_NAME} belum dikonfigurasi di server.`);
  }
  return createSupabaseClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
