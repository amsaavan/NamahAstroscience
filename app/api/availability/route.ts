import { NextRequest, NextResponse } from "next/server";
import { DAILY_SLOTS, isValidDate } from "@/lib/booking";
import { listBookedSlots } from "@/lib/booking-store";

function todayLocalDateString() {
  const now = new Date();
  const yyyy = String(now.getFullYear());
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
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
  const date = request.nextUrl.searchParams.get("date") ?? "";

  if (!isValidDate(date)) {
    return NextResponse.json(
      { error: "Invalid date format. Use YYYY-MM-DD." },
      { status: 400 }
    );
  }
  if (date < todayLocalDateString()) {
    return NextResponse.json(
      { error: "Past dates are not allowed." },
      { status: 400 }
    );
  }

  const bookedSlots = await listBookedSlots(date);

  // For today, treat already-passed slots as unavailable
  const isToday = date === todayLocalDateString();
  const availableSlots = isToday
    ? DAILY_SLOTS.filter((slot) => !isSlotInPast(slot))
    : DAILY_SLOTS;

  return NextResponse.json({
    date,
    slots: availableSlots,
    bookedSlots,
  });
}
