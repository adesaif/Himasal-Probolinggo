import { createClient as createSupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database.types";

// Read-only client for public content pages that don't depend on the
// visitor's session (no cookies involved). Using the cookie-bound server
// client (lib/supabase/server.ts) forces Next.js to render the route
// dynamically on every request, even for content that rarely changes.
// This client lets public pages use `export const revalidate` for real
// ISR instead of hitting Supabase on every single page view.
export function createPublicClient() {
  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
