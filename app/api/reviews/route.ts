import { NextRequest, NextResponse } from "next/server";
import { createReview, deleteReview, listReviews, updateReview } from "@/lib/review-store";
import { ADMIN_SESSION_COOKIE, verifySessionJwt } from "@/lib/admin-auth";
import { rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

function isAdminAuthed(request: NextRequest): boolean {
    const token = request.cookies.get(ADMIN_SESSION_COOKIE)?.value ?? "";
    return verifySessionJwt(token);
}

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
    // Rate limiting: 3 reviews per hour per IP
    const ip = request.headers.get("x-forwarded-for") ?? "unknown";
    if (!rateLimit(ip, 3, 60 * 60 * 1000)) {
        return NextResponse.json(
            { error: "Too many review submissions. Please try again later." },
            { status: 429 }
        );
    }

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
    if (!location) {
        return NextResponse.json({ error: "City/Town is required." }, { status: 400 });
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

    // Length limits
    if (name.length > 100) return NextResponse.json({ error: "Name must be 100 characters or fewer." }, { status: 400 });
    if (location.length > 150) return NextResponse.json({ error: "City must be 150 characters or fewer." }, { status: 400 });
    if (country.length > 100) return NextResponse.json({ error: "Country must be 100 characters or fewer." }, { status: 400 });
    if (review.length > 600) {
        return NextResponse.json(
            { error: "Review must be 600 characters or fewer." },
            { status: 400 }
        );
    }

    try {
        const created = await createReview({ name, location, country, rating, review });
        return NextResponse.json({ review: created }, { status: 201 });
    } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.error("[reviews POST] error:", message);
        return NextResponse.json({ error: "An unexpected error occurred. Please try again later." }, { status: 500 });
    }
}

export async function PUT(request: NextRequest) {
    if (!isAdminAuthed(request)) {
        return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const body = (await request.json()) as UpdatePayload;
    
    const id = (body.id ?? "").trim();
    if (!id) {
        return NextResponse.json({ error: "Review ID is required." }, { status: 400 });
    }

    const updates: Partial<{ name: string; location: string; country: string; rating: number; review: string; reply: string }> = {};
    if (typeof body.name === "string") updates.name = body.name.trim();
    if (typeof body.location === "string") updates.location = body.location.trim();
    if (typeof body.country === "string") updates.country = body.country.trim();
    if (body.rating !== undefined) updates.rating = Number(body.rating);
    if (typeof body.review === "string") updates.review = body.review.trim();
    if (typeof body.reply === "string") updates.reply = body.reply.trim();
    else if (body.reply === null) updates.reply = "";

    try {
        const updated = await updateReview(id, updates);
        return NextResponse.json({ review: updated }, { status: 200 });
    } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.error("[reviews PUT] error:", message);
        return NextResponse.json({ error: "An unexpected error occurred. Please try again later." }, { status: 500 });
    }
}

export async function DELETE(request: NextRequest) {
    if (!isAdminAuthed(request)) {
        return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const body = (await request.json()) as { id?: string };
    const id = (body.id ?? "").trim();

    if (!id) {
        return NextResponse.json({ error: "Review ID is required." }, { status: 400 });
    }

    try {
        const result = await deleteReview(id);
        if (!result.ok) {
            return NextResponse.json({ error: "Review not found." }, { status: 404 });
        }
        return NextResponse.json({ success: true });
    } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.error("[reviews DELETE] error:", message);
        return NextResponse.json({ error: "An unexpected error occurred. Please try again later." }, { status: 500 });
    }
}
