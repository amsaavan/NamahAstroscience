import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { BookingRecord, BookingsByDate } from "@/lib/booking";

const DATA_DIR = path.join(process.cwd(), "data");
const DATA_FILE = path.join(DATA_DIR, "bookings.json");

let writeQueue = Promise.resolve();

async function readStore(): Promise<BookingsByDate> {
    try {
        const raw = await readFile(DATA_FILE, "utf8");
        const parsed = JSON.parse(raw) as unknown;
        if (!parsed || typeof parsed !== "object") return {};
        return parsed as BookingsByDate;
    } catch (error) {
        const err = error as NodeJS.ErrnoException;
        if (err.code === "ENOENT") return {};
        throw error;
    }
}

async function writeStore(data: BookingsByDate) {
    await mkdir(DATA_DIR, { recursive: true });
    await writeFile(DATA_FILE, JSON.stringify(data, null, 2), "utf8");
}

export async function listBookedSlots(date: string): Promise<string[]> {
    const store = await readStore();
    return Object.keys(store[date] ?? {}).sort();
}

export async function listBookings(date?: string): Promise<BookingRecord[]> {
    const store = await readStore();
    const dates = date ? [date] : Object.keys(store);
    const out: BookingRecord[] = [];
    for (const dayKey of dates) {
        const day = store[dayKey] ?? {};
        for (const slot of Object.keys(day).sort()) out.push(day[slot]);
    }
    return out.sort((a, b) =>
        a.date === b.date ? a.slot.localeCompare(b.slot) : a.date.localeCompare(b.date)
    );
}

export async function createBooking(record: BookingRecord): Promise<{ ok: boolean; reason?: string }> {
    const run = async (): Promise<{ ok: boolean; reason?: string }> => {
        const store = await readStore();
        const day = store[record.date] ?? {};

        // Check if same email OR same whatsapp already has a booking ON THE SAME DATE
        for (const slotKey of Object.keys(day)) {
            const b = day[slotKey];
            if (
                b.email === record.email ||
                b.whatsapp === record.whatsapp
            ) {
                return { ok: false, reason: "duplicate_person_same_day" };
            }
        }

        store[record.date] = { ...day, [record.slot]: record };
        await writeStore(store);
        return { ok: true };
    };
    const next = writeQueue.then(run);
    writeQueue = next.then(() => undefined, () => undefined);
    return next;
}

export async function cancelBooking(date: string, slot: string) {
    const run = async () => {
        const store = await readStore();
        const day = store[date] ?? {};
        if (!day[slot]) return { ok: false as const };
        delete day[slot];
        if (Object.keys(day).length === 0) delete store[date];
        else store[date] = day;
        await writeStore(store);
        return { ok: true as const };
    };
    const next = writeQueue.then(run);
    writeQueue = next.then(() => undefined, () => undefined);
    return next;
}

export async function updateFeesPaid(date: string, slot: string, feesPaid: boolean) {
    const run = async () => {
        const store = await readStore();
        const day = store[date] ?? {};
        if (!day[slot]) return { ok: false as const };
        store[date] = { ...day, [slot]: { ...day[slot], feesPaid } };
        await writeStore(store);
        return { ok: true as const };
    };
    const next = writeQueue.then(run);
    writeQueue = next.then(() => undefined, () => undefined);
    return next;
}

export async function updateBookingCompleted(date: string, slot: string, completed: boolean, billedAmount?: string, currency?: string) {
    const run = async () => {
        const store = await readStore();
        const day = store[date] ?? {};
        if (!day[slot]) return { ok: false as const };
        const update: Partial<BookingRecord> = { completed };
        if (billedAmount !== undefined) update.billedAmount = billedAmount;
        if (currency !== undefined) update.currency = currency;
        store[date] = { ...day, [slot]: { ...day[slot], ...update } };
        await writeStore(store);
        return { ok: true as const };
    };
    const next = writeQueue.then(run);
    writeQueue = next.then(() => undefined, () => undefined);
    return next;
}

export async function updateBirthDetails(date: string, slot: string, birthDate: string, birthTime: string, birthPlace: string, birthLat?: number, birthLon?: number, birthTimezone?: string) {
    const run = async () => {
        const store = await readStore();
        const day = store[date] ?? {};
        if (!day[slot]) return { ok: false as const };
        const record = day[slot];
        store[date] = { 
            ...day, 
            [slot]: { 
                ...record, 
                birthDate, 
                birthTime, 
                birthPlace, 
                birthLat: birthLat ?? record.birthLat,
                birthLon: birthLon ?? record.birthLon,
                birthTimezone: birthTimezone ?? record.birthTimezone
            } 
        };
        await writeStore(store);
        return { ok: true as const };
    };
    const next = writeQueue.then(run);
    writeQueue = next.then(() => undefined, () => undefined);
    return next;
}

export async function updateBookingDateTime(oldDate: string, oldSlot: string, newDate: string, newSlot: string) {
    const run = async () => {
        const store = await readStore();
        const oldDay = store[oldDate] ?? {};
        if (!oldDay[oldSlot]) return { ok: false as const };
        
        const record = oldDay[oldSlot];
        
        // Remove old
        delete oldDay[oldSlot];
        if (Object.keys(oldDay).length === 0) delete store[oldDate];
        else store[oldDate] = oldDay;
        
        // Add new
        const newDay = store[newDate] ?? {};
        if (newDay[newSlot]) return { ok: false as const, reason: "slot_taken" };
        
        store[newDate] = { ...newDay, [newSlot]: { ...record, date: newDate, slot: newSlot } };
        
        await writeStore(store);
        return { ok: true as const, record: store[newDate][newSlot] };
    };
    const next = writeQueue.then(run);
    writeQueue = next.then(() => undefined, () => undefined);
    return next;
}

export async function updateBookingDetails(oldDate: string, oldSlot: string, updates: Partial<BookingRecord>) {
    const run = async () => {
        const store = await readStore();
        const oldDay = store[oldDate] ?? {};
        if (!oldDay[oldSlot]) return { ok: false as const };
        
        const oldRecord = oldDay[oldSlot];
        const record = { ...oldRecord, ...updates };
        const newDate = record.date;
        const newSlot = record.slot;

        if (newDate !== oldDate || newSlot !== oldSlot) {
            // Check if new slot taken
            const newDay = store[newDate] ?? {};
            if (newDay[newSlot]) return { ok: false as const, reason: "slot_taken" };

            // Remove old
            delete oldDay[oldSlot];
            if (Object.keys(oldDay).length === 0) delete store[oldDate];
            else store[oldDate] = oldDay;

            // Add new
            const finalNewDay = store[newDate] ?? {};
            store[newDate] = { ...finalNewDay, [newSlot]: record };
        } else {
            store[oldDate] = { ...oldDay, [oldSlot]: record };
        }
        
        await writeStore(store);
        return { ok: true as const, record };
    };
    const next = writeQueue.then(run);
    writeQueue = next.then(() => undefined, () => undefined);
    return next;
}

