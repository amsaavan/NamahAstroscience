import { supabase } from "@/lib/supabase";

export type ReviewRecord = {
    id: string; name: string; location: string; country: string;
    rating: number; review: string; reply?: string; createdAt: string;
};

export async function listReviews(): Promise<ReviewRecord[]> {
    const { data, error } = await supabase
        .from("reviews").select("*").order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []).map(rowToRecord);
}

export async function createReview(record: Omit<ReviewRecord, "id" | "createdAt" | "reply">): Promise<ReviewRecord> {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const createdAt = new Date().toISOString();
    const { data, error } = await supabase.from("reviews")
        .insert({ id, name: record.name, location: record.location ?? "", country: record.country, rating: record.rating, review: record.review, created_at: createdAt })
        .select().single();
    if (error) throw new Error(error.message);
    return rowToRecord(data as Record<string, unknown>);
}

export async function updateReview(
    id: string,
    updates: Partial<Omit<ReviewRecord, "id" | "createdAt">>
): Promise<ReviewRecord> {
    const dbUpdates: Record<string, unknown> = {};
    if (updates.name !== undefined) dbUpdates.name = updates.name;
    if (updates.location !== undefined) dbUpdates.location = updates.location;
    if (updates.country !== undefined) dbUpdates.country = updates.country;
    if (updates.rating !== undefined) dbUpdates.rating = updates.rating;
    if (updates.review !== undefined) dbUpdates.review = updates.review;
    if (updates.reply !== undefined) dbUpdates.reply = updates.reply;

    const { data, error } = await supabase.from("reviews")
        .update(dbUpdates)
        .eq("id", id)
        .select().single();
    if (error) throw new Error(error.message);
    return rowToRecord(data as Record<string, unknown>);
}

export async function deleteReview(id: string): Promise<{ ok: boolean }> {
    const { data: existing } = await supabase.from("reviews").select("id").eq("id", id).maybeSingle();
    if (!existing) return { ok: false };
    const { error } = await supabase.from("reviews").delete().eq("id", id);
    if (error) throw new Error(error.message);
    return { ok: true };
}

function rowToRecord(row: Record<string, unknown>): ReviewRecord {
    return {
        id: row.id as string, name: row.name as string, location: (row.location as string) ?? "",
        country: (row.country as string) ?? "",
        rating: row.rating as number, review: row.review as string, 
        reply: row.reply as string | undefined,
        createdAt: row.created_at as string,
    };
}
