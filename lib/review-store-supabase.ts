import { supabase } from "@/lib/supabase";

export type ReviewRecord = {
    id: string; name: string; location: string;
    rating: number; review: string; createdAt: string;
};

export async function listReviews(): Promise<ReviewRecord[]> {
    const { data, error } = await supabase
        .from("reviews").select("*").order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []).map(rowToRecord);
}

export async function createReview(record: Omit<ReviewRecord, "id" | "createdAt">): Promise<ReviewRecord> {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const createdAt = new Date().toISOString();
    const { data, error } = await supabase.from("reviews")
        .insert({ id, name: record.name, location: record.location ?? "", rating: record.rating, review: record.review, created_at: createdAt })
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
        rating: row.rating as number, review: row.review as string, createdAt: row.created_at as string,
    };
}
