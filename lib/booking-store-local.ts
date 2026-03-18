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
        if (day[record.slot]) return { ok: false, reason: "slot_taken" };

        // Check duplicate person across all dates
        for (const dateKey of Object.keys(store)) {
            for (const slotKey of Object.keys(store[dateKey])) {
                const b = store[dateKey][slotKey];
                if (
                    b.fullName === record.fullName &&
                    b.email === record.email &&
                    b.whatsapp === record.whatsapp
                ) {
                    return { ok: false, reason: "duplicate_person" };
                }
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

export async function updateBookingCompleted(date: string, slot: string, completed: boolean) {
    const run = async () => {
        const store = await readStore();
        const day = store[date] ?? {};
        if (!day[slot]) return { ok: false as const };
        store[date] = { ...day, [slot]: { ...day[slot], completed } };
        await writeStore(store);
        return { ok: true as const };
    };
    const next = writeQueue.then(run);
    writeQueue = next.then(() => undefined, () => undefined);
    return next;
}

export async function updateBirthDetails(date: string, slot: string, birthDate: string, birthTime: string, birthPlace: string) {
    const run = async () => {
        const store = await readStore();
        const day = store[date] ?? {};
        if (!day[slot]) return { ok: false as const };
        store[date] = { ...day, [slot]: { ...day[slot], birthDate, birthTime, birthPlace } };
        await writeStore(store);
        return { ok: true as const };
    };
    const next = writeQueue.then(run);
    writeQueue = next.then(() => undefined, () => undefined);
    return next;
}
