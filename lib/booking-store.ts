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

export async function updateBookingCompleted(date: string, slot: string, completed: boolean, billedAmount?: string, currency?: string) {
  if (isVercel) {
    const { updateBookingCompleted } = await import("@/lib/booking-store-supabase");
    return updateBookingCompleted(date, slot, completed, billedAmount, currency);
  }
  const { updateBookingCompleted } = await import("@/lib/booking-store-local");
  return updateBookingCompleted(date, slot, completed, billedAmount, currency);
}

export async function updateBirthDetails(date: string, slot: string, birthDate: string, birthTime: string, birthPlace: string, lat?: number, lon?: number, timezone?: string) {
  if (isVercel) {
    const { updateBirthDetails } = await import("@/lib/booking-store-supabase");
    return updateBirthDetails(date, slot, birthDate, birthTime, birthPlace, lat, lon, timezone);
  }
  const { updateBirthDetails } = await import("@/lib/booking-store-local");
  return updateBirthDetails(date, slot, birthDate, birthTime, birthPlace, lat, lon, timezone);
}

export async function updateBookingDateTime(oldDate: string, oldSlot: string, newDate: string, newSlot: string) {
  if (isVercel) {
    const { updateBookingDateTime } = await import("@/lib/booking-store-supabase");
    return updateBookingDateTime(oldDate, oldSlot, newDate, newSlot);
  }
  const { updateBookingDateTime } = await import("@/lib/booking-store-local");
  return updateBookingDateTime(oldDate, oldSlot, newDate, newSlot);
}

export async function updateBookingDetails(oldDate: string, oldSlot: string, updates: Partial<BookingRecord>) {
  if (isVercel) {
    const { updateBookingDetails } = await import("@/lib/booking-store-supabase");
    return updateBookingDetails(oldDate, oldSlot, updates);
  }
  const { updateBookingDetails } = await import("@/lib/booking-store-local");
  return updateBookingDetails(oldDate, oldSlot, updates);
}
