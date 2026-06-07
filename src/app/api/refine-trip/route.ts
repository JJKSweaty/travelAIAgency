import { NextResponse } from "next/server";
import { refineTrip } from "@/lib/travel/planner";
import { refinementSchema } from "@/lib/travel/schema";
import { exactTravelDatesRequiredMessage, hasExactTravelDates } from "@/lib/travel/travelDates";
import type { TripPlan } from "@/lib/travel/types";

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = refinementSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid refinement request", issues: parsed.error.flatten() }, { status: 400 });
  }

  const sourcePlan = parsed.data.plan as TripPlan;
  if (!hasExactTravelDates(sourcePlan.request)) {
    return NextResponse.json({ error: exactTravelDatesRequiredMessage }, { status: 400 });
  }

  const plan = await refineTrip(sourcePlan, parsed.data.intent);
  return NextResponse.json(plan);
}
