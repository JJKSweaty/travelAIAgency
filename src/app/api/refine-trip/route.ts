import { NextResponse } from "next/server";
import { refineTrip } from "@/lib/travel/planner";
import { refinementSchema } from "@/lib/travel/schema";
import type { TripPlan } from "@/lib/travel/types";

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = refinementSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid refinement request", issues: parsed.error.flatten() }, { status: 400 });
  }

  const plan = await refineTrip(parsed.data.plan as TripPlan, parsed.data.intent);
  return NextResponse.json(plan);
}
