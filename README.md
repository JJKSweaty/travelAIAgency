# aiTravelAgency

A budget-first AI travel planning web app built with Next.js, TypeScript, and Tailwind CSS.

The app guides a traveler through origin, destination mode, flexible month or exact dates, trip length, budget, traveler count, style, interests, and transport preferences. It then generates a trip plan with:

- destination recommendation, trending fallback, and global origin/destination autocomplete
- repeated destination discovery using the same budget and trip settings
- budget feasibility and category split
- hotel, transport, restaurant, and attraction recommendations
- flight and hotel price comparison graphics with source links
- day-by-day itinerary
- outbound search/booking links
- local saved trips
- refinement actions such as cheaper, luxury, relaxed, adventure, and food-focused

## Commands

```bash
npm install
npm run dev
npm test
npm run build
```

Open `http://localhost:3000` after starting the dev server.

## Data Providers

V1 uses provider interfaces with curated fallback data so the app works without paid API keys. Live provider adapters can be added behind the existing interfaces in `src/lib/travel/providers.ts`.

Origin and preferred destination search accept free text, so travelers can plan any origin-to-destination route. Autocomplete is backed by Open-Meteo geocoding when available, then falls back to curated travel seeds and a typed custom location. Automatic destination mode ranks destinations by budget fit first, then trend and interest fit. Curated destination matches receive richer fallback data; unmatched destinations use generic fallback estimates and verification links. Results can be refined with "Try another destination" to keep cycling through budget-fit recommendations.

The app does not scrape booking websites directly. It normalizes provider/API or fallback quote data and links users to major travel search surfaces to verify live prices. Exact-date mode builds specific Google Flights, Google Hotels, and Booking.com hotel searches. Without `TRAVEL_PRICE_API_KEY`/provider adapters and normalized airport/location IDs, non-Google provider cards open broad provider searches and flight/hotel prices shown in the app are planner estimates, not live provider prices.

Optional environment keys checked by `/api/health`:

- `TRAVEL_TRENDS_API_KEY`
- `HOTELS_API_KEY`
- `TRAVEL_PRICE_API_KEY`
- `CARS_API_KEY`
- `RESTAURANTS_API_KEY`
- `ATTRACTIONS_API_KEY`

Global location autocomplete is available at `GET /api/location-suggestions?q=lis&mode=destination`. The older curated destination endpoint remains available at `GET /api/destination-suggestions?q=lis`.

Optional location search settings:

- `OPEN_METEO_GEOCODING_BASE_URL`, default `https://geocoding-api.open-meteo.com/v1/search`
- `OPEN_METEO_API_KEY`, only needed for Open-Meteo commercial/customer API setups
- `LOCATION_SEARCH_TIMEOUT_MS`, default `2500`

Optional AI itinerary enrichment uses OpenRouter when `OPENROUTER_API_KEY` is set:

- `OPENROUTER_API_KEY`, your OpenRouter API key
- `OPENROUTER_MODEL`, default `nvidia/nemotron-3.5-content-safety:free`
- `OPENROUTER_BASE_URL`, default `https://openrouter.ai/api/v1/chat/completions`
- `OPENROUTER_TIMEOUT_MS`, default `12000`
- `OPENROUTER_TEMPERATURE`, default `0.8`
- `OPENROUTER_TOP_P`, default `0.9`
- `OPENROUTER_MAX_TOKENS`, default `1100`
- `OPENROUTER_HTTP_REFERER` (optional leaderboard attribution)
- `OPENROUTER_X_TITLE` (optional leaderboard attribution)

If OpenRouter is unavailable, invalid, or not configured, the deterministic fallback itinerary generator is used.

## AI Usage

AI itinerary drafting runs through OpenRouter. When `OPENROUTER_API_KEY` is configured, the planner sends the selected destination, exact/flexible dates, trip settings, restaurants, and attractions to the configured OpenRouter model (default: `nvidia/nemotron-3.5-content-safety:free`) and expects strict JSON itinerary output. Budget allocation, destination ranking, provider links, and fallback estimates are deterministic TypeScript logic.

## Project Skill

The local Codex skill for this project is maintained at:

`~/.codex/skills/ai-travel-agency`
