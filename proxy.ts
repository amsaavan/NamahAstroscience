import { NextRequest, NextResponse } from "next/server";
import {
  ADMIN_SESSION_COOKIE,
  isAdminConfigValid,
  isValidSessionToken,
} from "@/lib/admin-auth";

function unauthorizedApi() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

function badConfig() {
  return NextResponse.json(
    { error: "Admin auth is not configured on the server." },
    { status: 503 }
  );
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname === "/admin/login") {
    const token = request.cookies.get(ADMIN_SESSION_COOKIE)?.value ?? "";
    if (isValidSessionToken(token)) {
      return NextResponse.redirect(new URL("/admin/bookings", request.url));
    }
    return NextResponse.next();
  }

  const shouldProtectAdmin = pathname.startsWith("/admin/");
  const shouldProtectBookingsApi =
    pathname === "/api/bookings" &&
    (request.method === "GET" || request.method === "DELETE");

  if (!shouldProtectAdmin && !shouldProtectBookingsApi) {
    return NextResponse.next();
  }

  if (!isAdminConfigValid()) {
    return badConfig();
  }

  const token = request.cookies.get(ADMIN_SESSION_COOKIE)?.value ?? "";
  const authenticated = isValidSessionToken(token);

  if (authenticated) {
    return NextResponse.next();
  }

  if (shouldProtectBookingsApi) {
    return unauthorizedApi();
  }

  const loginUrl = new URL("/admin/login", request.url);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/admin/:path*", "/api/bookings"],
};
