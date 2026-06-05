# aiTravelAgency

A budget-first AI travel planning web app built with Next.js, TypeScript, and Tailwind CSS.

The app guides a traveler through origin, destination mode, trip length, budget, traveler count, style, interests, and transport preferences. It then generates a trip plan with:

- destination recommendation, trending fallback, and curated destination autocomplete
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

V1 uses provider interfaces with curated fallback data so the app works without API keys. Live provider adapters can be added behind the existing interfaces in `src/lib/travel/providers.ts`.

The app does not scrape booking websites directly. It normalizes provider/API or fallback quote data and links users to major travel search surfaces to verify live prices.

Optional environment keys checked by `/api/health`:

- `TRAVEL_TRENDS_API_KEY`
- `HOTELS_API_KEY`
- `TRAVEL_PRICE_API_KEY`
- `CARS_API_KEY`
- `RESTAURANTS_API_KEY`
- `ATTRACTIONS_API_KEY`

Destination autocomplete is available at `GET /api/destination-suggestions?q=lis`.

Optional local AI itinerary enrichment uses Ollama when `OLLAMA_MODEL` is set:

- `OLLAMA_MODEL`, for example `llama3.1`
- `OLLAMA_BASE_URL`, default `http://localhost:11434`
- `OLLAMA_TIMEOUT_MS`, default `8000`

If Ollama is unavailable, invalid, or not configured, the deterministic fallback itinerary generator is used.

## Project Skill

The local Codex skill for this project is maintained at:

`~/.codex/skills/ai-travel-agency`
