import type { SiteContent } from "@/lib/content-store-local";

const isVercel = Boolean(process.env.VERCEL);

export type { SiteContent, SiteService } from "@/lib/content-store-local";

export async function getContent(): Promise<SiteContent | null> {
  if (isVercel) {
    const { getContent } = await import("@/lib/content-store-supabase");
    return getContent();
  }
  const { getContent } = await import("@/lib/content-store-local");
  return getContent();
}

export async function updateContent(content: SiteContent): Promise<void> {
  if (isVercel) {
    const { updateContent } = await import("@/lib/content-store-supabase");
    return updateContent(content);
  }
  const { updateContent } = await import("@/lib/content-store-local");
  return updateContent(content);
}
