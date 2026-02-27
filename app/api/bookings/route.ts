import { NextRequest, NextResponse } from "next/server";
import { BookingRecord, isValidDate, isValidSlot } from "@/lib/booking";
import { cancelBooking, createBooking, listBookings, updateFeesPaid } from "@/lib/booking-store";
import {
  sendAdminBookingNotification,
  sendBookingConfirmation,
} from "@/lib/email";

type BookingPayload = {
  fullName: string;
  email: string;
  whatsapp: string;
  notes?: string;
  date: string;
  slot: string;
};

function normalize(payload: BookingPayload): BookingRecord {
  return {
    fullName: payload.fullName.trim(),
    email: payload.email.trim(),
    whatsapp: payload.whatsapp.trim(),
    notes: (payload.notes ?? "").trim(),
    date: payload.date.trim(),
    slot: payload.slot.trim(),
    createdAt: new Date().toISOString(),
    feesPaid: false,
  };
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function todayLocalDateString() {
  const now = new Date();
  const yyyy = String(now.getFullYear());
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function maxBookingDateString() {
  const d = new Date();
  d.setDate(d.getDate() + 7);
  const yyyy = String(d.getFullYear());
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export async function GET(request: NextRequest) {
  const date = request.nextUrl.searchParams.get("date");

  if (date && !isValidDate(date)) {
    return NextResponse.json(
      { error: "Invalid date format. Use YYYY-MM-DD." },
      { status: 400 }
    );
  }

  const bookings = await listBookings(date ?? undefined);
  return NextResponse.json({ bookings });
}

export async function POST(request: NextRequest) {
  const body = (await request.json()) as BookingPayload;
  const booking = normalize(body);

  if (!booking.fullName || !booking.email || !booking.whatsapp) {
    return NextResponse.json(
      { error: "Name, email, and WhatsApp number are required." },
      { status: 400 }
    );
  }

  if (!isValidEmail(booking.email)) {
    return NextResponse.json({ error: "Invalid email address." }, { status: 400 });
  }

  if (!isValidDate(booking.date)) {
    return NextResponse.json(
      { error: "Invalid date format. Use YYYY-MM-DD." },
      { status: 400 }
    );
  }
  if (booking.date < todayLocalDateString()) {
    return NextResponse.json(
      { error: "Past dates are not allowed." },
      { status: 400 }
    );
  }
  if (booking.date > maxBookingDateString()) {
    return NextResponse.json(
      { error: "Bookings are only accepted up to 7 days in advance." },
      { status: 400 }
    );
  }

  if (!isValidSlot(booking.slot)) {
    return NextResponse.json(
      { error: "Invalid slot selected." },
      { status: 400 }
    );
  }

  try {
    const result = await createBooking(booking);
    if (!result.ok) {
      return NextResponse.json(
        { error: "This slot is already booked. Please choose another." },
        { status: 409 }
      );
    }

    const [emailResult, adminEmailResult] = await Promise.all([
      sendBookingConfirmation(booking),
      sendAdminBookingNotification(booking),
    ]);

    return NextResponse.json(
      {
        success: true,
        emailSent: emailResult.sent,
        emailReason: emailResult.reason ?? null,
        adminEmailSent: adminEmailResult.sent,
        adminEmailReason: adminEmailResult.reason ?? null,
      },
      { status: 201 }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[bookings POST] Supabase error:", message);
    return NextResponse.json({ error: `Server error: ${message}` }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const body = (await request.json()) as { date?: string; slot?: string; feesPaid?: boolean };
  const date = (body.date ?? "").trim();
  const slot = (body.slot ?? "").trim();
  const feesPaid = body.feesPaid;

  if (!isValidDate(date)) {
    return NextResponse.json(
      { error: "Invalid date format. Use YYYY-MM-DD." },
      { status: 400 }
    );
  }
  if (!isValidSlot(slot)) {
    return NextResponse.json({ error: "Invalid slot selected." }, { status: 400 });
  }
  if (typeof feesPaid !== "boolean") {
    return NextResponse.json({ error: "feesPaid must be a boolean." }, { status: 400 });
  }

  const result = await updateFeesPaid(date, slot, feesPaid);
  if (!result.ok) {
    return NextResponse.json(
      { error: "Booking not found for selected date and slot." },
      { status: 404 }
    );
  }

  return NextResponse.json({ success: true });
}

export async function DELETE(request: NextRequest) {
  const body = (await request.json()) as { date?: string; slot?: string };
  const date = (body.date ?? "").trim();
  const slot = (body.slot ?? "").trim();

  if (!isValidDate(date)) {
    return NextResponse.json(
      { error: "Invalid date format. Use YYYY-MM-DD." },
      { status: 400 }
    );
  }

  if (!isValidSlot(slot)) {
    return NextResponse.json({ error: "Invalid slot selected." }, { status: 400 });
  }

  const result = await cancelBooking(date, slot);
  if (!result.ok) {
    return NextResponse.json(
      { error: "Booking not found for selected date and slot." },
      { status: 404 }
    );
  }

  return NextResponse.json({ success: true });
}
