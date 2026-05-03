import { NextResponse } from "next/server";
import { getContent } from "@/lib/content-store";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const content = await getContent();
    return NextResponse.json({ content });
  } catch (error: any) {
    console.error("GET /api/content error:", error);
    return NextResponse.json({ error: "Failed to fetch content." }, { status: 500 });
  }
}
