import { NextResponse } from "next/server";
import { scrapeAllowedHotelWebsite } from "@/lib/travel/providers/hotels/hotelWebsiteScraper";

type AccommodationLinkBody = {
  url?: string;
};

const listingHosts = [/airbnb\./i, /booking\./i, /expedia\./i, /hotels\./i, /vrbo\./i, /agoda\./i];

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as AccommodationLinkBody | null;
  const url = safeHttpUrl(body?.url);
  if (!url) return NextResponse.json({ error: "Paste a valid accommodation URL." }, { status: 400 });

  const base = metadataFromUrl(url);
  if (listingHosts.some((pattern) => pattern.test(url.hostname))) {
    return NextResponse.json({
      accommodation: base,
      message: "Listing site details could not be read directly. Add the nightly price shown on that page."
    });
  }

  const scraped = await scrapeAllowedHotelWebsite({ sourceUrl: url.toString() }).catch(() => null);
  return NextResponse.json({
    accommodation: {
      ...base,
      description: scraped?.description ?? base.description,
      imageUrl: scraped?.imageUrl ?? null,
      address: scraped?.address ?? null,
      dataQuality: scraped?.dataQuality ?? "search-link",
      fetchedAt: scraped?.fetchedAt ?? new Date().toISOString()
    },
    message: scraped ? undefined : "I could not read details from this page. Add the nightly price shown on the listing."
  });
}

function metadataFromUrl(url: URL) {
  const host = url.hostname.replace(/^www\./, "");
  const pathParts = url.pathname
    .split("/")
    .map((part) => decodeURIComponent(part).replace(/[-_]+/g, " ").trim())
    .filter((part) => part && !/^\d+$/.test(part));
  const label = titleCase(pathParts[pathParts.length - 1] ?? host.split(".")[0] ?? "Custom stay");
  return {
    name: label,
    location: host,
    sourceUrl: url.toString(),
    source: host,
    description: `Accommodation link from ${host}.`,
    imageUrl: null,
    address: null,
    dataQuality: "search-link" as const,
    fetchedAt: new Date().toISOString()
  };
}

function safeHttpUrl(value?: string) {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:" ? url : null;
  } catch {
    return null;
  }
}

function titleCase(value: string) {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
