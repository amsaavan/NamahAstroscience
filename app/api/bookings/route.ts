import { NextRequest, NextResponse } from "next/server";
import { BookingRecord, isValidDate, isValidSlot } from "@/lib/booking";
import { cancelBooking, createBooking, listBookings, updateFeesPaid, updateBookingCompleted } from "@/lib/booking-store";
import {
  sendAdminBookingNotification,
  sendBookingConfirmation,
} from "@/lib/email";
import { ADMIN_SESSION_COOKIE, verifySessionJwt } from "@/lib/admin-auth";

function isAdminAuthed(request: NextRequest): boolean {
  const token = request.cookies.get(ADMIN_SESSION_COOKIE)?.value ?? "";
  return verifySessionJwt(token);
}


type BookingPayload = {
  fullName: string;
  email: string;
  whatsapp: string;
  notes?: string;
  date: string;
  slot: string;
  birthDate?: string;
  birthTime?: string;
  birthPlace?: string;
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
    birthDate: (payload.birthDate ?? "").trim(),
    birthTime: (payload.birthTime ?? "").trim(),
    birthPlace: (payload.birthPlace ?? "").trim(),
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

/** Returns true when a slot (HH:MM) has already passed for today. */
function isSlotInPast(slot: string): boolean {
  const [hStr, mStr] = slot.split(":");
  const now = new Date();
  const slotMinutes = Number(hStr) * 60 + Number(mStr);
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  return nowMinutes >= slotMinutes;
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

  // Reject slots that have already passed when booking is for today
  if (booking.date === todayLocalDateString() && isSlotInPast(booking.slot)) {
    return NextResponse.json(
      { error: "This time slot has already passed. Please choose a future slot." },
      { status: 400 }
    );
  }

  try {
    const result = await createBooking(booking);
    if (!result.ok) {
      if (result.reason === "duplicate_person") {
        return NextResponse.json(
          { error: "You have already made a booking. Only one booking per person is allowed." },
          { status: 409 }
        );
      }
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
  if (!isAdminAuthed(request)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const body = (await request.json()) as { date?: string; slot?: string; feesPaid?: boolean; completed?: boolean };
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

  if (body.feesPaid !== undefined) {
    if (typeof body.feesPaid !== "boolean") {
      return NextResponse.json({ error: "feesPaid must be a boolean." }, { status: 400 });
    }
    const result = await updateFeesPaid(date, slot, body.feesPaid);
    if (!result.ok) {
      return NextResponse.json(
        { error: "Booking not found for selected date and slot." },
        { status: 404 }
      );
    }
    return NextResponse.json({ success: true });
  }

  if (body.completed !== undefined) {
    if (typeof body.completed !== "boolean") {
      return NextResponse.json({ error: "completed must be a boolean." }, { status: 400 });
    }
    const result = await updateBookingCompleted(date, slot, body.completed);
    if (!result.ok) {
      return NextResponse.json(
        { error: "Booking not found for selected date and slot." },
        { status: 404 }
      );
    }
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "No update parameters provided." }, { status: 400 });
}

export async function DELETE(request: NextRequest) {
  if (!isAdminAuthed(request)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

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
