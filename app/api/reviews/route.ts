import { NextRequest, NextResponse } from "next/server";
import { createReview, deleteReview, listReviews } from "@/lib/review-store";

type ReviewPayload = {
    name: string;
    location?: string;
    rating: number;
    review: string;
};

export async function GET() {
    const reviews = await listReviews();
    return NextResponse.json({ reviews });
}

export async function POST(request: NextRequest) {
    const body = (await request.json()) as ReviewPayload;

    const name = (body.name ?? "").trim();
    const location = (body.location ?? "").trim();
    const rating = Number(body.rating);
    const review = (body.review ?? "").trim();

    if (!name) {
        return NextResponse.json({ error: "Name is required." }, { status: 400 });
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

    const created = await createReview({ name, location, rating, review });
    return NextResponse.json({ review: created }, { status: 201 });
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
