import { supabase } from "@/lib/supabase";
import { BookingRecord } from "@/lib/booking";

export async function listBookedSlots(date: string): Promise<string[]> {
    const { data, error } = await supabase
        .from("bookings")
        .select("slot")
        .eq("date", date);
    if (error) throw new Error(error.message);
    return (data ?? []).map((r: { slot: string }) => r.slot).sort();
}

export async function listBookings(date?: string): Promise<BookingRecord[]> {
    let query = supabase
        .from("bookings")
        .select("*")
        .order("date", { ascending: true })
        .order("slot", { ascending: true });
    if (date) query = query.eq("date", date);
    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return (data ?? []).map(rowToRecord);
}

export async function createBooking(record: BookingRecord): Promise<{ ok: boolean; reason?: string }> {
    // Check if same email OR same whatsapp already has a booking ON THE SAME DATE
    const { data: existingSameDay } = await supabase
        .from("bookings")
        .select("slot")
        .eq("date", record.date)
        .or(`email.eq."${record.email}",whatsapp.eq."${record.whatsapp}"`)
        .maybeSingle();
    if (existingSameDay) return { ok: false, reason: "duplicate_person_same_day" };

    const { error } = await supabase.from("bookings").insert({
        date: record.date, slot: record.slot, full_name: record.fullName,
        email: record.email, whatsapp: record.whatsapp, notes: record.notes ?? "",
        created_at: record.createdAt, fees_paid: record.feesPaid ?? false,
        completed: record.completed ?? false,
        birth_date: record.birthDate ?? "",
        birth_time: record.birthTime ?? "",
        birth_place: record.birthPlace ?? "",
        birth_lat: record.birthLat ?? null,
        birth_lon: record.birthLon ?? null,
        birth_timezone: record.birthTimezone ?? null,
    });
    if (error) {
        if (error.code === "23505") return { ok: false, reason: "slot_taken" };
        throw new Error(error.message);
    }
    return { ok: true };
}

export async function cancelBooking(date: string, slot: string): Promise<{ ok: boolean }> {
    const { data: existing } = await supabase
        .from("bookings").select("slot").eq("date", date).eq("slot", slot).maybeSingle();
    if (!existing) return { ok: false };
    const { error } = await supabase.from("bookings").delete().eq("date", date).eq("slot", slot);
    if (error) throw new Error(error.message);
    return { ok: true };
}

export async function updateFeesPaid(date: string, slot: string, feesPaid: boolean): Promise<{ ok: boolean }> {
    const { data: existing } = await supabase
        .from("bookings").select("slot").eq("date", date).eq("slot", slot).maybeSingle();
    if (!existing) return { ok: false };
    const { error } = await supabase.from("bookings").update({ fees_paid: feesPaid }).eq("date", date).eq("slot", slot);
    if (error) throw new Error(error.message);
    return { ok: true };
}

export async function updateBookingCompleted(date: string, slot: string, completed: boolean, billedAmount?: string, currency?: string): Promise<{ ok: boolean }> {
    const { data: existing } = await supabase
        .from("bookings").select("slot").eq("date", date).eq("slot", slot).maybeSingle();
    if (!existing) return { ok: false };
    const update: any = { completed };
    if (billedAmount !== undefined) update.billed_amount = billedAmount;
    if (currency !== undefined) update.currency = currency;
    const { error } = await supabase.from("bookings").update(update).eq("date", date).eq("slot", slot);
    if (error) throw new Error(error.message);
    return { ok: true };
}

export async function updateBirthDetails(date: string, slot: string, birthDate: string, birthTime: string, birthPlace: string, lat?: number, lon?: number, timezone?: string): Promise<{ ok: boolean }> {
    const { data: existing } = await supabase
        .from("bookings").select("slot").eq("date", date).eq("slot", slot).maybeSingle();
    if (!existing) return { ok: false };
    const { error } = await supabase.from("bookings").update({
        birth_date: birthDate,
        birth_time: birthTime,
        birth_place: birthPlace,
        birth_lat: lat ?? null,
        birth_lon: lon ?? null,
        birth_timezone: timezone ?? null
    }).eq("date", date).eq("slot", slot);
    if (error) throw new Error(error.message);
    return { ok: true };
}

function rowToRecord(row: Record<string, unknown>): BookingRecord {
    return {
        date: row.date as string, slot: row.slot as string,
        fullName: row.full_name as string, email: row.email as string,
        whatsapp: row.whatsapp as string, notes: (row.notes as string) ?? "",
        createdAt: row.created_at as string, feesPaid: (row.fees_paid as boolean) ?? false,
        completed: (row.completed as boolean) ?? false,
        billedAmount: (row.billed_amount as string) ?? "",
        currency: (row.currency as string) ?? "₹",
        birthDate: (row.birth_date as string) ?? "",
        birthTime: (row.birth_time as string) ?? "",
        birthPlace: (row.birth_place as string) ?? "",
        birthLat: (row.birth_lat as number) ?? undefined,
        birthLon: (row.birth_lon as number) ?? undefined,
        birthTimezone: (row.birth_timezone as string) ?? undefined,
    };
}
