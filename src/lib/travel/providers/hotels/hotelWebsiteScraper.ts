import type { HotelResult } from "../../types";

export type HotelWebsiteScrapeInput = {
  sourceUrl: string;
  now?: Date;
};

export type HotelWebsiteScrapeResult = Pick<HotelResult, "description" | "amenities" | "imageUrl" | "address" | "sourceUrl" | "fetchedAt" | "dataQuality"> & {
  expiresAt: string;
};

export async function scrapeAllowedHotelWebsite(input: HotelWebsiteScrapeInput): Promise<HotelWebsiteScrapeResult | null> {
  const url = safeHttpUrl(input.sourceUrl);
  if (!url) return null;
  if (!(await robotsAllows(url))) return null;

  const response = await fetch(url, { headers: { "User-Agent": "RoamlyBot/1.0" } });
  if (!response.ok || !contentTypeIsHtml(response.headers.get("content-type"))) return null;
  const html = await response.text();
  const now = input.now ?? new Date();

  return {
    sourceUrl: url.toString(),
    description: metaContent(html, "description"),
    amenities: [],
    imageUrl: metaContent(html, "og:image"),
    address: null,
    fetchedAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString(),
    dataQuality: "partial"
  };
}

async function robotsAllows(url: URL) {
  const robotsUrl = new URL("/robots.txt", url.origin);
  const response = await fetch(robotsUrl);
  if (!response.ok) return true;
  const robots = await response.text();
  const disallowed = robots
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => /^disallow:/i.test(line))
    .map((line) => line.replace(/^disallow:\s*/i, "").trim())
    .filter(Boolean);
  return !disallowed.some((path) => path === "/" || url.pathname.startsWith(path));
}

function safeHttpUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:" ? url : null;
  } catch {
    return null;
  }
}

function contentTypeIsHtml(value: string | null) {
  return !value || /text\/html/i.test(value);
}

function metaContent(html: string, key: string) {
  const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(`<meta[^>]+(?:name|property)=["']${escaped}["'][^>]+content=["']([^"']+)["'][^>]*>`, "i");
  return pattern.exec(html)?.[1] ?? null;
}
