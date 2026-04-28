import { NextRequest, NextResponse } from "next/server";
import { createReview, deleteReview, listReviews, updateReview } from "@/lib/review-store";

export const dynamic = "force-dynamic";

type ReviewPayload = {
    name: string;
    location?: string;
    country?: string;
    rating: number;
    review: string;
};

type UpdatePayload = {
    id: string;
    name?: string;
    location?: string;
    country?: string;
    rating?: number;
    review?: string;
    reply?: string;
};

export async function GET() {
    const reviews = await listReviews();
    return NextResponse.json({ reviews });
}

export async function POST(request: NextRequest) {
    const body = (await request.json()) as ReviewPayload;

    const name = (body.name ?? "").trim();
    const location = (body.location ?? "").trim();
    const country = (body.country ?? "").trim();
    const rating = Number(body.rating);
    const review = (body.review ?? "").trim();

    if (!name) {
        return NextResponse.json({ error: "Name is required." }, { status: 400 });
    }
    if (!country) {
        return NextResponse.json({ error: "Country is required." }, { status: 400 });
    }
    if (!review) {
        return NextResponse.json(
            { error: "Review text is required." },
            { status: 400 }
        );
    }
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
        return NextResponse.json(
            { error: "Rating must be between 1 and 5." },
            { status: 400 }
        );
    }
    if (review.length > 600) {
        return NextResponse.json(
            { error: "Review must be 600 characters or fewer." },
            { status: 400 }
        );
    }

    const created = await createReview({ name, location, country, rating, review });
    return NextResponse.json({ review: created }, { status: 201 });
}

export async function PUT(request: NextRequest) {
    const body = (await request.json()) as UpdatePayload;
    
    const id = (body.id ?? "").trim();
    if (!id) {
        return NextResponse.json({ error: "Review ID is required." }, { status: 400 });
    }

    const updates: Partial<{ name: string; location: string; country: string; rating: number; review: string; reply: string }> = {};
    if (body.name !== undefined) updates.name = body.name.trim();
    if (body.location !== undefined) updates.location = body.location.trim();
    if (body.country !== undefined) updates.country = body.country.trim();
    if (body.rating !== undefined) updates.rating = Number(body.rating);
    if (body.review !== undefined) updates.review = body.review.trim();
    if (body.reply !== undefined) updates.reply = body.reply.trim();

    try {
        const updated = await updateReview(id, updates);
        return NextResponse.json({ review: updated }, { status: 200 });
    } catch (error: any) {
        return NextResponse.json({ error: error.message || "Failed to update review." }, { status: 500 });
    }
}

export async function DELETE(request: NextRequest) {
    const body = (await request.json()) as { id?: string };
    const id = (body.id ?? "").trim();

    if (!id) {
        return NextResponse.json({ error: "Review ID is required." }, { status: 400 });
    }

    const result = await deleteReview(id);
    if (!result.ok) {
        return NextResponse.json({ error: "Review not found." }, { status: 404 });
    }

    return NextResponse.json({ success: true });
}
