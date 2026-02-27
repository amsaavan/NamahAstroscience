import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

export type ReviewRecord = {
    id: string;
    name: string;
    location: string;
    rating: number;
    review: string;
    createdAt: string;
};

const DATA_DIR = path.join(process.cwd(), "data");
const DATA_FILE = path.join(DATA_DIR, "reviews.json");

let writeQueue = Promise.resolve();

async function readStore(): Promise<ReviewRecord[]> {
    try {
        const raw = await readFile(DATA_FILE, "utf8");
        const parsed = JSON.parse(raw) as unknown;
        if (!Array.isArray(parsed)) return [];
        return parsed as ReviewRecord[];
    } catch (error) {
        const err = error as NodeJS.ErrnoException;
        if (err.code === "ENOENT") return [];
        throw error;
    }
}

async function writeStore(data: ReviewRecord[]) {
    await mkdir(DATA_DIR, { recursive: true });
    await writeFile(DATA_FILE, JSON.stringify(data, null, 2), "utf8");
}

export async function listReviews(): Promise<ReviewRecord[]> {
    const reviews = await readStore();
    return reviews.slice().sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
}

export async function createReview(
    record: Omit<ReviewRecord, "id" | "createdAt">
): Promise<ReviewRecord> {
    const run = async () => {
        const store = await readStore();
        const newReview: ReviewRecord = {
            ...record,
            id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            createdAt: new Date().toISOString(),
        };
        store.push(newReview);
        await writeStore(store);
        return newReview;
    };
    const next = writeQueue.then(run);
    writeQueue = next.then(() => undefined, () => undefined);
    return next;
}

export async function deleteReview(id: string): Promise<{ ok: boolean }> {
    const run = async () => {
        const store = await readStore();
        const index = store.findIndex((r) => r.id === id);
        if (index === -1) return { ok: false as const };
        store.splice(index, 1);
        await writeStore(store);
        return { ok: true as const };
    };
    const next = writeQueue.then(run);
    writeQueue = next.then(() => undefined, () => undefined);
    return next;
}
