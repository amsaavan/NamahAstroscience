import { NextRequest, NextResponse } from "next/server";

const COOKIE_NAME = "admin_session";

/**
 * Edge-compatible JWT verification (Web Crypto API / HMAC-SHA256).
 * proxy.ts runs on the Edge runtime — Node's crypto is not available.
 */
async function verifyJwt(token: string): Promise<boolean> {
  try {
    const secret = process.env.ADMIN_JWT_SECRET ?? "";
    if (!secret || !token) return false;

    const parts = token.split(".");
    if (parts.length !== 3) return false;
    const [header, payload, sig] = parts;

    const keyData = new TextEncoder().encode(secret);
    const cryptoKey = await crypto.subtle.importKey(
      "raw",
      keyData,
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify"]
    );

    const data = new TextEncoder().encode(`${header}.${payload}`);
    const sigBytes = Uint8Array.from(
      atob(sig.replace(/-/g, "+").replace(/_/g, "/")),
      (c) => c.charCodeAt(0)
    );

    const isValid = await crypto.subtle.verify("HMAC", cryptoKey, sigBytes, data);
    if (!isValid) return false;

    const decoded = JSON.parse(atob(payload.replace(/-/g, "+").replace(/_/g, "/")));
    return decoded.exp > Math.floor(Date.now() / 1000);
  } catch {
    return false;
  }
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get(COOKIE_NAME)?.value ?? "";

  // If already logged in and visiting /admin/login → redirect to dashboard
  if (pathname === "/admin/login" || pathname.startsWith("/admin/login/")) {
    if (await verifyJwt(token)) {
      return NextResponse.redirect(new URL("/admin/bookings", request.url));
    }
    return NextResponse.next();
  }

  // Protect all other /admin/* pages
  if (pathname.startsWith("/admin/")) {
    if (!(await verifyJwt(token))) {
      return NextResponse.redirect(new URL("/admin/login", request.url));
    }
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
