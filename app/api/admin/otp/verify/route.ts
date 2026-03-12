import { NextRequest, NextResponse } from "next/server";
import {
    ADMIN_SESSION_COOKIE,
    isAuthConfigValid,
    signSessionJwt,
    verifyOtp,
} from "@/lib/admin-auth";

type VerifyPayload = { otp?: string };

export async function POST(request: NextRequest) {
    if (!isAuthConfigValid()) {
        return NextResponse.json(
            { error: "Auth not configured on server." },
            { status: 503 }
        );
    }

    const body = (await request.json()) as VerifyPayload;
    const otp = (body.otp ?? "").trim();

    if (!otp) {
        return NextResponse.json({ error: "OTP is required." }, { status: 400 });
    }

    if (!verifyOtp(otp)) {
        return NextResponse.json(
            { error: "Invalid or expired OTP. Please request a new one." },
            { status: 401 }
        );
    }

    const token = signSessionJwt();
    const response = NextResponse.json({ success: true });
    response.cookies.set({
        name: ADMIN_SESSION_COOKIE,
        value: token,
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: 60 * 60 * 24 * 7, // 7 days
    });
    return response;
}
