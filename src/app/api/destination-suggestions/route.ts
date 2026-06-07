import { NextResponse } from "next/server";
import { suggestDestinations } from "@/lib/travel/providers";
import { isMonthOnly, travelMonthRequiredMessage } from "@/lib/travel/travelDates";

export function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q") ?? "";
  const travelMonth = searchParams.get("travelMonth") ?? searchParams.get("month") ?? "";
  if (!isMonthOnly(travelMonth)) {
    return NextResponse.json({ destinations: [], message: travelMonthRequiredMessage }, { status: 400 });
  }

  return NextResponse.json({ destinations: suggestDestinations(query) });
}
