import { NextRequest, NextResponse } from "next/server";
import { BookingRecord, isValidDate, isValidSlot } from "@/lib/booking";
import { cancelBooking, createBooking, listBookings, updateFeesPaid, updateBookingCompleted, updateBirthDetails } from "@/lib/booking-store";
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
  const now = new Date();
  const timestamp = now.getTime();
  const rawSlot = (payload.slot || "Standard").trim();
  // Ensure every booking has a unique slot internally to allow multiple same-day appointments
  const uniqueSlot = `${rawSlot}-${timestamp}`;

  return {
    fullName: payload.fullName.trim(),
    email: payload.email.trim(),
    whatsapp: payload.whatsapp.trim(),
    notes: (payload.notes ?? "").trim(),
    date: payload.date.trim(),
    slot: uniqueSlot,
    createdAt: now.toISOString(),
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

function isSlotInPast(slot: string): boolean {
  // Always returns false as we are removing specific time slots
  return false;
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

  // Validation for slot-specific timings is removed as we now only book dates.
  // The 'slot' parameter is now usually hardcoded as 'Standard' on the frontend.


  try {
    const result = await createBooking(booking);
    if (!result.ok) {
      if (result.reason === "duplicate_person_same_day") {
        return NextResponse.json(
          { error: "You have already booked a session for this date using this email or phone number. Please choose another date or contact us if you need to make changes." },
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

  const body = (await request.json()) as { date?: string; slot?: string; feesPaid?: boolean; completed?: boolean; birthDate?: string; birthTime?: string; birthPlace?: string };
  const date = (body.date ?? "").trim();
  const slot = (body.slot ?? "").trim();

  if (!isValidDate(date)) {
    return NextResponse.json(
      { error: "Invalid date format. Use YYYY-MM-DD." },
      { status: 400 }
    );
  }
  if (!isValidSlot(slot)) {
    // We allow any non-empty slot string now for backward compatibility
    if (!slot) return NextResponse.json({ error: "Slot identification is required." }, { status: 400 });
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

  if (body.birthDate !== undefined || body.birthTime !== undefined || body.birthPlace !== undefined) {
    const result = await updateBirthDetails(
      date,
      slot,
      (body.birthDate ?? "").trim(),
      (body.birthTime ?? "").trim(),
      (body.birthPlace ?? "").trim(),
    );
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
    if (!slot) return NextResponse.json({ error: "Slot identification is required." }, { status: 400 });
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
