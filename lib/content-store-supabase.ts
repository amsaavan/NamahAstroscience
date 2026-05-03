import { supabase } from "./supabase";
import type { SiteContent } from "./content-store-local";

export async function getContent(): Promise<SiteContent | null> {
  const { data, error } = await supabase
    .from("site_content")
    .select("content")
    .eq("id", 1)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      // Row doesn't exist
      return null;
    }
    console.error("Supabase getContent error:", error);
    return null;
  }

  return data?.content as SiteContent;
}

export async function updateContent(content: SiteContent): Promise<void> {
  const { error } = await supabase
    .from("site_content")
    .upsert({ id: 1, content }, { onConflict: "id" });

  if (error) {
    console.error("Supabase updateContent error:", error);
    throw new Error(error.message);
  }
}
