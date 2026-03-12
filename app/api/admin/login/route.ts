import { NextResponse } from "next/server";

// Old username/password login is replaced by OTP-based login.
// Requests here are redirected to the new OTP flow.
export async function POST() {
  return NextResponse.json(
    { error: "This endpoint is deprecated. Use /api/admin/otp/send and /api/admin/otp/verify." },
    { status: 410 }
  );
}
