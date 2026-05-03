import fs from "fs/promises";
import path from "path";

export type SiteService = {
  title: string;
  desc: string;
};

export type SiteContent = {
  themeColor: string;
  heroTitle: string;
  heroSubtitle: string;
  aboutPreface: string;
  aboutPoints: string[];
  services: SiteService[];
};

const filePath = path.join(process.cwd(), "data", "content.json");

export async function getContent(): Promise<SiteContent | null> {
  try {
    const data = await fs.readFile(filePath, "utf-8");
    return JSON.parse(data) as SiteContent;
  } catch (error: any) {
    if (error.code === "ENOENT") return null;
    throw error;
  }
}

export async function updateContent(content: SiteContent): Promise<void> {
  await fs.writeFile(filePath, JSON.stringify(content, null, 2), "utf-8");
}
