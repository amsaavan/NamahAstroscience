/**
 * Auto-switching store: uses JSON files locally, Supabase on Vercel.
 */
import type { BookingRecord } from "@/lib/booking";

const isVercel = Boolean(process.env.VERCEL);

export async function listBookedSlots(date: string): Promise<string[]> {
  if (isVercel) {
    const { listBookedSlots } = await import("@/lib/booking-store-supabase");
    return listBookedSlots(date);
  }
  const { listBookedSlots } = await import("@/lib/booking-store-local");
  return listBookedSlots(date);
}

export async function listBookings(date?: string): Promise<BookingRecord[]> {
  if (isVercel) {
    const { listBookings } = await import("@/lib/booking-store-supabase");
    return listBookings(date);
  }
  const { listBookings } = await import("@/lib/booking-store-local");
  return listBookings(date);
}

export async function createBooking(record: BookingRecord) {
  if (isVercel) {
    const { createBooking } = await import("@/lib/booking-store-supabase");
    return createBooking(record);
  }
  const { createBooking } = await import("@/lib/booking-store-local");
  return createBooking(record);
}

export async function cancelBooking(date: string, slot: string) {
  if (isVercel) {
    const { cancelBooking } = await import("@/lib/booking-store-supabase");
    return cancelBooking(date, slot);
  }
  const { cancelBooking } = await import("@/lib/booking-store-local");
  return cancelBooking(date, slot);
}

export async function updateFeesPaid(date: string, slot: string, feesPaid: boolean) {
  if (isVercel) {
    const { updateFeesPaid } = await import("@/lib/booking-store-supabase");
    return updateFeesPaid(date, slot, feesPaid);
  }
  const { updateFeesPaid } = await import("@/lib/booking-store-local");
  return updateFeesPaid(date, slot, feesPaid);
}

export async function updateBookingCompleted(date: string, slot: string, completed: boolean) {
  if (isVercel) {
    const { updateBookingCompleted } = await import("@/lib/booking-store-supabase");
    return updateBookingCompleted(date, slot, completed);
  }
  const { updateBookingCompleted } = await import("@/lib/booking-store-local");
  return updateBookingCompleted(date, slot, completed);
}
