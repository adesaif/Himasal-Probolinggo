import { NextResponse, type NextRequest } from "next/server";

import { updateSession } from "@/lib/supabase/middleware";
import { ROLE_HOME_ROUTE, type Role } from "@/lib/constants";

// Each protected area requires an exact role match - an authenticated user
// with the wrong role is redirected to their OWN home, not just blocked,
// so e.g. an admin hitting /monitoring lands on /admin instead of a dead
// end. This is enforced here AND by RLS/RPC at the database layer (see
// supabase/migrations) - the proxy is a UX convenience, not the only guard.
const ROUTE_ROLE_REQUIREMENTS: { prefix: string; role: Role }[] = [
  { prefix: "/dashboard", role: "alumni" },
  { prefix: "/admin", role: "admin" },
  { prefix: "/monitoring", role: "super_admin" },
];

export async function proxy(request: NextRequest) {
  const { supabaseResponse, user, role } = await updateSession(request);
  const { pathname } = request.nextUrl;

  const requirement = ROUTE_ROLE_REQUIREMENTS.find((r) =>
    pathname.startsWith(r.prefix),
  );

  if (requirement) {
    if (!user) {
      const redirectUrl = new URL("/login", request.url);
      redirectUrl.searchParams.set("redirect_to", pathname);
      return NextResponse.redirect(redirectUrl);
    }

    if (role !== requirement.role) {
      const home = role ? ROLE_HOME_ROUTE[role] : "/login";
      return NextResponse.redirect(new URL(home, request.url));
    }
  }

  // Already-authenticated users don't need the login form again.
  if (pathname === "/login" && user && role) {
    return NextResponse.redirect(new URL(ROLE_HOME_ROUTE[role], request.url));
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
