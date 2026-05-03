import { NextRequest, NextResponse } from "next/server";
import { updateContent } from "@/lib/content-store";
import { ADMIN_SESSION_COOKIE, verifySessionJwt } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

function isAdminAuthed(request: NextRequest): boolean {
  const token = request.cookies.get(ADMIN_SESSION_COOKIE)?.value ?? "";
  return verifySessionJwt(token);
}

export async function PUT(request: NextRequest) {
  if (!isAdminAuthed(request)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  try {
    const body = await request.json();
    await updateContent(body);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("PUT /api/admin/content error:", error);
    return NextResponse.json({ error: "Failed to update content." }, { status: 500 });
  }
}
