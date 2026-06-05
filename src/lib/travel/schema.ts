import { z } from "zod";

export const tripRequestSchema = z.object({
  origin: z.string().min(2),
  preferredDestinationEnabled: z.boolean(),
  destination: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  tripLengthDays: z.coerce.number().int().min(1).max(21),
  totalBudget: z.coerce.number().min(250).max(100000),
  travelers: z.coerce.number().int().min(1).max(12),
  travelStyle: z.enum(["relaxed", "balanced", "packed"]),
  interests: z.array(z.enum(["food", "nightlife", "nature", "museums", "beaches", "family", "luxury", "budget", "adventure"])).min(1),
  transportPreference: z.enum(["rental-car", "public-transit", "flexible"]),
  excludedDestinationIds: z.array(z.string()).optional()
});

export const refinementSchema = z.object({
  plan: z.any(),
  intent: z.enum(["cheaper", "luxury", "food", "relaxed", "adventure", "next-destination", "replace-hotel", "regenerate"])
});
