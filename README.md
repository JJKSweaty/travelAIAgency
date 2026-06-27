# Roamly

Roamly is a budget-smart AI travel planning web app built with **Next.js**, **TypeScript**, **Tailwind CSS**, and optional **Supabase** account storage.

It helps travelers plan realistic trips by combining destination discovery, budget breakdowns, itinerary generation, hotel and transport estimates, and outbound booking/search links for live price verification.

## Features

* Flexible trip planning by month, exact dates, trip length, traveler count, currency, budget, and travel style
* Global origin and destination autocomplete
* Automatic destination recommendations based on budget fit, trends, and interests
* Budget feasibility checks with category-level cost estimates
* Hotel, flight, transport, restaurant, attraction, and in-city travel estimates
* Day-by-day itinerary generation with route suggestions
* Refinement actions such as cheaper, luxury, relaxed, adventure, food-focused, another destination, replacement hotel, and regenerate
* Guest saved trips using browser storage
* Account saved trips using Supabase when configured
* Outbound links to Google Flights, Google Hotels, Booking.com, and other travel search surfaces for live verification

## Tech Stack

* **Framework:** Next.js
* **Language:** TypeScript
* **Styling:** Tailwind CSS
* **Auth and Storage:** Supabase optional
* **Location Search:** Open-Meteo geocoding with curated fallbacks
* **AI Itinerary Enrichment:** Optional OpenRouter integration
* **Testing:** npm test

## Getting Started

Install dependencies:

```bash
npm install
```

Start the development server:

```bash
npm run dev
```

Run tests:

```bash
npm test
```

Build for production:

```bash
npm run build
```

After starting the dev server, open:

```bash
http://localhost:3000
```

## Supabase Setup

Roamly works in guest mode without Supabase. Guest trips are saved locally in the browser.

To enable login and account-saved trips:

1. Create a Supabase project
2. Enable email authentication in Supabase Auth
3. Add the following environment variables:

```bash
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-publishable-key
```

The modern Supabase publishable key uses the `sb_publishable_...` format and replaces the older anon key for browser/client-side code.

Do not place a Supabase secret key such as `sb_secret_...` inside any `NEXT_PUBLIC_` environment variable.

Then run this SQL in Supabase:

```sql
create table public.trips (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  plan_id text not null,
  plan jsonb not null,
  destination_name text generated always as (plan->'destination'->>'name') stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, plan_id)
);

alter table public.trips enable row level security;

create policy "Users can read own trips"
  on public.trips for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can insert own trips"
  on public.trips for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users can update own trips"
  on public.trips for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users can delete own trips"
  on public.trips for delete
  to authenticated
  using ((select auth.uid()) = user_id);
```

## Authentication

The `/auth` page supports:

* Email and password login
* Account creation
* Magic-link login
* Sign out
* Guest trip import

If email confirmations are enabled in Supabase, new users must confirm their email before logging in.

Unauthenticated users stay in guest mode and save trips locally. After signing in, the auth and saved trips pages can import guest trips into the user’s Supabase account.

## Currency Support

Supported display currencies:

* USD
* CAD
* EUR
* GBP
* AUD
* JPY
* MXN

Fallback and provider estimates are treated as USD internally, then converted using deterministic static rates for planning display.

These are planning estimates only and should not be treated as live exchange rates.

## Data Providers

Roamly V1 uses provider interfaces with curated fallback data, so the app can run without paid API keys.

Live provider adapters can be added behind the existing interfaces in:

```bash
src/lib/travel/providers.ts
```

Origin and preferred destination search support free text input. Autocomplete uses Open-Meteo geocoding when available, then falls back to curated travel seeds and typed custom locations.

Automatic destination mode ranks options by:

1. Budget fit
2. Trend score
3. Interest match

Roamly does not scrape booking websites directly. It normalizes provider/API or fallback quote data, then links users to major travel search surfaces so they can verify live prices themselves.

Exact-date mode builds specific search links for Google Flights, Google Hotels, and Booking.com hotel searches.

## Optional Environment Variables

The `/api/health` route checks for optional provider keys:

```bash
TRAVEL_TRENDS_API_KEY
HOTELS_API_KEY
TRAVEL_PRICE_API_KEY
CARS_API_KEY
RESTAURANTS_API_KEY
ATTRACTIONS_API_KEY
```

Optional location search settings:

```bash
OPEN_METEO_GEOCODING_BASE_URL=https://geocoding-api.open-meteo.com/v1/search
OPEN_METEO_API_KEY=
LOCATION_SEARCH_TIMEOUT_MS=2500
```

`OPEN_METEO_API_KEY` is only needed for Open-Meteo commercial or customer API setups.

## Optional AI Itinerary Enrichment

Roamly can use OpenRouter for AI-enriched itinerary generation when `OPENROUTER_API_KEY` is configured.

```bash
OPENROUTER_API_KEY=
OPENROUTER_MODEL=nvidia/nemotron-3.5-content-safety:free
OPENROUTER_BASE_URL=https://openrouter.ai/api/v1/chat/completions
OPENROUTER_TIMEOUT_MS=12000
OPENROUTER_TEMPERATURE=0.8
OPENROUTER_TOP_P=0.9
OPENROUTER_MAX_TOKENS=1100
OPENROUTER_HTTP_REFERER=
OPENROUTER_X_TITLE=
```

If OpenRouter is unavailable, invalid, or not configured, Roamly uses a deterministic fallback itinerary generator.

## Project Skill

The local Codex skill for this project is maintained at:

```bash
~/.codex/skills/ai-travel-agency
```

## Notes

Roamly is designed for trip planning and price exploration. Prices, currency conversions, hotel estimates, flight estimates, and itinerary suggestions should be verified through the outbound booking/search links before making real travel decisions.
