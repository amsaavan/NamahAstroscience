import { NextResponse } from "next/server";
import {
    buildOtpCookieValue,
    canSendOtp,
    generateOtp,
    isAuthConfigValid,
    nextOtpAllowedInMs,
    OTP_COOKIE,
    otpTtlSeconds,
} from "@/lib/admin-auth";
import { sendAdminOtp } from "@/lib/email";

export async function POST() {
    if (!isAuthConfigValid()) {
        return NextResponse.json(
            { error: "Auth not configured on server." },
            { status: 503 }
        );
    }

    if (!canSendOtp()) {
        const waitSec = Math.ceil(nextOtpAllowedInMs() / 1000);
        return NextResponse.json(
            { error: `Please wait ${waitSec}s before requesting another OTP.` },
            { status: 429 }
        );
    }

    const otp = generateOtp();
    const expiresAt = Date.now() + otpTtlSeconds() * 1000;
    const result = await sendAdminOtp(otp);

    if (!result.sent) {
        return NextResponse.json(
            { error: "Failed to send OTP email. Check SMTP configuration." },
            { status: 500 }
        );
    }

    // Store the HMAC-signed token in a short-lived httpOnly cookie.
    // This survives HMR reloads and serverless cold starts.
    const response = NextResponse.json({ success: true });
    response.cookies.set({
        name: OTP_COOKIE,
        value: buildOtpCookieValue(otp, expiresAt),
        httpOnly: true,
        sameSite: "strict",
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: otpTtlSeconds(),
    });
    return response;
}
