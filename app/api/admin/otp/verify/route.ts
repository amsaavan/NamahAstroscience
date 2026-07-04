import { NextRequest, NextResponse } from "next/server";
import {
    ADMIN_SESSION_COOKIE,
    isAuthConfigValid,
    OTP_COOKIE,
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

    // Read the signed OTP token from the cookie set during /send
    const cookieValue = request.cookies.get(OTP_COOKIE)?.value ?? "";

    if (!verifyOtp(otp, cookieValue)) {
        return NextResponse.json(
            { error: "Invalid or expired OTP. Please request a new one." },
            { status: 401 }
        );
    }

    const token = signSessionJwt();
    const response = NextResponse.json({ success: true });

    // Set admin session cookie
    response.cookies.set({
        name: ADMIN_SESSION_COOKIE,
        value: token,
        httpOnly: true,
        sameSite: "strict",
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: 60 * 60 * 24 * 7, // 7 days — matches JWT exp
    });

    // Clear the OTP cookie — it's single-use
    response.cookies.set({
        name: OTP_COOKIE,
        value: "",
        httpOnly: true,
        sameSite: "strict",
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: 0,
    });

    return response;
}
