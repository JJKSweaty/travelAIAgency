import { NextResponse } from "next/server";
import { suggestLocations } from "@/lib/travel/locations";
import type { LocationSuggestionMode } from "@/lib/travel/types";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q") ?? "";
  const mode: LocationSuggestionMode = searchParams.get("mode") === "origin" ? "origin" : "destination";
  const locations = await suggestLocations(query, { mode });
  return NextResponse.json({ locations });
}
