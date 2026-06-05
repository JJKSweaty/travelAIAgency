# aiTravelAgency

A budget-first AI travel planning web app built with Next.js, TypeScript, and Tailwind CSS.

The app guides a traveler through origin, destination mode, travel month, trip length, budget, traveler count, style, interests, and transport preferences. It then generates a trip plan with:

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

The app does not scrape booking websites directly. It normalizes provider/API or fallback quote data and links users to major travel search surfaces to verify live prices. Without `TRAVEL_PRICE_API_KEY`/provider adapters, flight and hotel prices shown in the app are planner estimates, not live provider prices.

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

Optional local AI itinerary enrichment uses Ollama when `OLLAMA_MODEL` is set:

- `OLLAMA_MODEL`, for example `llama3.1`
- `OLLAMA_BASE_URL`, default `http://localhost:11434`
- `OLLAMA_TIMEOUT_MS`, default `8000`

If Ollama is unavailable, invalid, or not configured, the deterministic fallback itinerary generator is used.

## AI Usage

AI is local-only through Ollama. When `OLLAMA_MODEL` is configured, the planner sends the selected destination, trip settings, restaurants, and attractions to Ollama to draft the day-by-day itinerary JSON. Budget allocation, destination ranking, provider links, and fallback estimates are deterministic TypeScript logic, not an AI API. No OpenAI or other hosted AI API is required.

## Project Skill

The local Codex skill for this project is maintained at:

`~/.codex/skills/ai-travel-agency`
