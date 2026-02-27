/**
 * Auto-switching store: uses JSON files locally, Supabase on Vercel.
 */

const isVercel = Boolean(process.env.VERCEL);

export type { ReviewRecord } from "@/lib/review-store-local";

export async function listReviews() {
    if (isVercel) {
        const { listReviews } = await import("@/lib/review-store-supabase");
        return listReviews();
    }
    const { listReviews } = await import("@/lib/review-store-local");
    return listReviews();
}

export async function createReview(record: { name: string; location: string; rating: number; review: string }) {
    if (isVercel) {
        const { createReview } = await import("@/lib/review-store-supabase");
        return createReview(record);
    }
    const { createReview } = await import("@/lib/review-store-local");
    return createReview(record);
}

export async function deleteReview(id: string) {
    if (isVercel) {
        const { deleteReview } = await import("@/lib/review-store-supabase");
        return deleteReview(id);
    }
    const { deleteReview } = await import("@/lib/review-store-local");
    return deleteReview(id);
}
