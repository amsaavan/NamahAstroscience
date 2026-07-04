import { NextRequest, NextResponse } from "next/server";
import { rateLimit } from "@/lib/rate-limit";

/**
 * GET /api/geocode?place=Mumbai%2C+India
 *
 * Server-side geocoding via OpenStreetMap Nominatim (free, no API key).
 * Returns { lat, lon, displayName } or { error }.
 *
 * We proxy this through Next.js so the browser never calls Nominatim directly
 * (Nominatim requires a proper User-Agent and discourages direct browser calls).
 */

type NominatimResult = {
    lat: string;
    lon: string;
    display_name: string;
};

export async function GET(request: NextRequest) {
    // Rate limit: 30 requests per minute per IP
    const ip = request.headers.get("x-forwarded-for") ?? "unknown";
    if (!rateLimit(ip, 30, 60 * 1000)) {
        return NextResponse.json({ error: "Too many requests. Please try again later." }, { status: 429 });
    }

    const searchParams = request.nextUrl.searchParams;
    const place = (searchParams.get("place") ?? "").trim();
    const city = (searchParams.get("city") ?? "").trim();
    const state = (searchParams.get("state") ?? "").trim();
    const country = (searchParams.get("country") ?? "").trim();

    if (!place && !city && !state && !country) {
        return NextResponse.json({ error: "place, city, state, or country query param is required." }, { status: 400 });
    }

    let url: string;
    if (city || state || country) {
        // Structured search for higher accuracy
        const params = new URLSearchParams({ format: "json", limit: "1" });
        if (city) params.append("city", city);
        if (state) params.append("state", state);
        if (country) params.append("country", country);
        url = `https://nominatim.openstreetmap.org/search?${params.toString()}`;
    } else {
        // Fallback to general search query
        url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(place)}&format=json&limit=1`;
    }

    try {
        const res = await fetch(url, {
            headers: {
                // Nominatim requires a descriptive User-Agent
                "User-Agent": "NamahAstroscience/1.0 (info@contact.namahastroscience.com)",
                "Accept-Language": "en",
            },
            // Cache result for 24 hours — the same city rarely changes coordinates
            next: { revalidate: 86400 },
        });

        if (!res.ok) {
            return NextResponse.json(
                { error: `Nominatim returned ${res.status}` },
                { status: 502 }
            );
        }

        const data = (await res.json()) as NominatimResult[];

        if (!data || data.length === 0) {
            return NextResponse.json(
                { error: "Place not found. Try a more specific city name." },
                { status: 404 }
            );
        }

        const { lat, lon, display_name } = data[0];

        return NextResponse.json({
            lat: parseFloat(lat),
            lon: parseFloat(lon),
            displayName: display_name,
        });
    } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.error("[geocode] Nominatim fetch failed:", message);
        return NextResponse.json({ error: "Geocoding service unavailable. Please try again." }, { status: 500 });
    }
}
