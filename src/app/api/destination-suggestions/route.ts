import { NextResponse } from "next/server";
import { suggestDestinations } from "@/lib/travel/providers";

export function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q") ?? "";
  return NextResponse.json({ destinations: suggestDestinations(query) });
}
