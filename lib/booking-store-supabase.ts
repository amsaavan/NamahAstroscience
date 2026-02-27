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
    // Check if slot is already taken
    const { data: existingSlot } = await supabase
        .from("bookings").select("slot").eq("date", record.date).eq("slot", record.slot).maybeSingle();
    if (existingSlot) return { ok: false, reason: "slot_taken" };

    // Check if same person (name + email + whatsapp) already has any booking
    const { data: existingPerson } = await supabase
        .from("bookings")
        .select("slot")
        .eq("full_name", record.fullName)
        .eq("email", record.email)
        .eq("whatsapp", record.whatsapp)
        .maybeSingle();
    if (existingPerson) return { ok: false, reason: "duplicate_person" };

    const { error } = await supabase.from("bookings").insert({
        date: record.date, slot: record.slot, full_name: record.fullName,
        email: record.email, whatsapp: record.whatsapp, notes: record.notes ?? "",
        created_at: record.createdAt, fees_paid: record.feesPaid ?? false,
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

function rowToRecord(row: Record<string, unknown>): BookingRecord {
    return {
        date: row.date as string, slot: row.slot as string,
        fullName: row.full_name as string, email: row.email as string,
        whatsapp: row.whatsapp as string, notes: (row.notes as string) ?? "",
        createdAt: row.created_at as string, feesPaid: (row.fees_paid as boolean) ?? false,
    };
}
