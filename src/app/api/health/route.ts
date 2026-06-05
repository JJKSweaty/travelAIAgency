import { NextResponse } from "next/server";
import { providerHealth } from "@/lib/travel/planner";

export function GET() {
  return NextResponse.json(providerHealth());
}
