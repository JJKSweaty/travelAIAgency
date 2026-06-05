# Roamly

A budget-smart AI travel planning web app built with Next.js, TypeScript, Tailwind CSS, and Supabase-ready saved trips.

Roamly guides a traveler through origin, destination mode, flexible month or exact dates, trip length, budget, currency, traveler count, style, interests, transport, and in-city travel preferences. It generates:

- destination recommendations with global origin/destination autocomplete
- budget feasibility and category split in the selected currency
- hotel, transport, restaurant, attraction, flight, and hotel-search estimates
- day-by-day itinerary with generated city route suggestions
- outbound search/booking links for live verification
- guest saved trips in browser storage
- account saved trips through Supabase when configured
- refinements such as cheaper, luxury, relaxed, adventure, food-focused, another destination, replacement hotel, and regenerate

## Commands

```bash
npm install
npm run dev
npm test
npm run build
```

Open `http://localhost:3000` after starting the dev server.

## Supabase Setup

Roamly works in guest mode without Supabase. To enable login and account-saved trips, create a Supabase project, enable email auth in Auth, and add these environment variables:

```bash
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

Run this SQL in Supabase:

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

The `/auth` page supports email/password login, creating an account, magic-link login, sign out, and guest-trip import. If email confirmations are enabled in Supabase, newly created users must confirm their email before logging in. Unauthenticated users remain in guest mode and save trips locally. After signing in, the auth and saved pages can import guest trips into the Supabase account.

## Currency

Supported display currencies are USD, CAD, EUR, GBP, AUD, JPY, and MXN. Fallback/provider estimates are treated as USD internally, then converted with deterministic static rates for planning display. These are planning estimates only, not live exchange rates.

## Data Providers

V1 uses provider interfaces with curated fallback data so the app works without paid API keys. Live provider adapters can be added behind the existing interfaces in `src/lib/travel/providers.ts`.

Origin and preferred destination search accept free text. Autocomplete is backed by Open-Meteo geocoding when available, then curated travel seeds and a typed custom location. Automatic destination mode ranks destinations by budget fit first, then trend and interest fit.

The app does not scrape booking websites directly. It normalizes provider/API or fallback quote data and links users to major travel search surfaces to verify live prices. Exact-date mode builds specific Google Flights, Google Hotels, and Booking.com hotel searches.

Optional environment keys checked by `/api/health`:

- `TRAVEL_TRENDS_API_KEY`
- `HOTELS_API_KEY`
- `TRAVEL_PRICE_API_KEY`
- `CARS_API_KEY`
- `RESTAURANTS_API_KEY`
- `ATTRACTIONS_API_KEY`

Optional location search settings:

- `OPEN_METEO_GEOCODING_BASE_URL`, default `https://geocoding-api.open-meteo.com/v1/search`
- `OPEN_METEO_API_KEY`, only needed for Open-Meteo commercial/customer API setups
- `LOCATION_SEARCH_TIMEOUT_MS`, default `2500`

Optional AI itinerary enrichment uses OpenRouter when `OPENROUTER_API_KEY` is set:

- `OPENROUTER_API_KEY`
- `OPENROUTER_MODEL`, default `nvidia/nemotron-3.5-content-safety:free`
- `OPENROUTER_BASE_URL`, default `https://openrouter.ai/api/v1/chat/completions`
- `OPENROUTER_TIMEOUT_MS`, default `12000`
- `OPENROUTER_TEMPERATURE`, default `0.8`
- `OPENROUTER_TOP_P`, default `0.9`
- `OPENROUTER_MAX_TOKENS`, default `1100`
- `OPENROUTER_HTTP_REFERER` optional attribution
- `OPENROUTER_X_TITLE` optional attribution

If OpenRouter is unavailable, invalid, or not configured, the deterministic fallback itinerary generator is used.

## Project Skill

The local Codex skill for this project is maintained at:

`~/.codex/skills/ai-travel-agency`
