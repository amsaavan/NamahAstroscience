import { NextResponse } from "next/server";
import { getContent } from "@/lib/content-store";

// Cache the content response for 60 seconds (ISR).
// Content changes rarely — this eliminates a Supabase call on every page load.
export const revalidate = 60;

export async function GET() {
  try {
    const content = await getContent();
    return NextResponse.json({ content });
  } catch (error: any) {
    console.error("GET /api/content error:", error);
    return NextResponse.json({ error: "Failed to fetch content." }, { status: 500 });
  }
}
