import { NextResponse } from "next/server";
import { planTrip } from "@/lib/travel/planner";
import { tripRequestSchema } from "@/lib/travel/schema";
import { hasTravelMonth, travelMonthRequiredMessage } from "@/lib/travel/travelDates";

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = tripRequestSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid trip request", issues: parsed.error.flatten() }, { status: 400 });
  }

  if (!hasTravelMonth(parsed.data)) {
    return NextResponse.json({ error: travelMonthRequiredMessage }, { status: 400 });
  }

  const plan = await planTrip(parsed.data);
  return NextResponse.json(plan);
}
