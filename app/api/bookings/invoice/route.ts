import { NextRequest, NextResponse } from "next/server";
import { listBookings } from "@/lib/booking-store";
import { sendInvoiceEmail, sendPaymentReminderEmail } from "@/lib/email";
import { ADMIN_SESSION_COOKIE, verifySessionJwt } from "@/lib/admin-auth";

function isAdminAuthed(request: NextRequest): boolean {
  const token = request.cookies.get(ADMIN_SESSION_COOKIE)?.value ?? "";
  return verifySessionJwt(token);
}

export async function POST(request: NextRequest) {
  if (!isAdminAuthed(request)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const body = (await request.json()) as { 
    date: string; 
    slot: string; 
    type: "invoice" | "reminder";
    amount: string;
    currency?: string;
    note?: string;
  };

  const { date, slot, type, amount, currency, note } = body;

  if (!date || !slot || !type || !amount) {
    return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
  }

  try {
    const bookings = await listBookings(date);
    const booking = bookings.find(b => b.slot === slot);

    if (!booking) {
      return NextResponse.json({ error: "Booking not found." }, { status: 404 });
    }

    let emailResult;
    if (type === "invoice") {
      emailResult = await sendInvoiceEmail(booking, amount, currency, note);
    } else {
      emailResult = await sendPaymentReminderEmail(booking, amount, currency);
    }

    if (!emailResult.sent) {
      return NextResponse.json({ error: emailResult.reason ?? "Email failed to send." }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
