import { NextResponse } from "next/server";
import {
    canSendOtp,
    generateOtp,
    isAuthConfigValid,
    nextOtpAllowedInMs,
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
    const result = await sendAdminOtp(otp);

    if (!result.sent) {
        return NextResponse.json(
            { error: "Failed to send OTP email. Check SMTP configuration." },
            { status: 500 }
        );
    }

    return NextResponse.json({ success: true });
}
