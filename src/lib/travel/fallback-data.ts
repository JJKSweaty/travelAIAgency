import type { AttractionOption, CarOption, DestinationOption, HotelOption, Interest, PriceQuote, RestaurantOption, TripRequest } from "./types";

export const destinations: DestinationOption[] = [
  {
    id: "lisbon",
    name: "Lisbon",
    country: "Portugal",
    summary: "Sunny neighborhoods, ocean air, strong food culture, and lower costs than many Western European capitals.",
    imageUrl: "https://images.unsplash.com/photo-1501927023255-9063be98970c?auto=format&fit=crop&w=1400&q=80",
    costLevel: 2,
    trendingScore: 94,
    bestFor: ["food", "nightlife", "museums", "budget"],
    averageNightlyHotel: 145,
    averageDailyFood: 55,
    averageDailyActivities: 42,
    bookingLink: "https://www.google.com/travel/explore?q=Lisbon%20Portugal"
  },
  {
    id: "mexico-city",
    name: "Mexico City",
    country: "Mexico",
    summary: "A high-energy city for restaurants, museums, markets, architecture, and excellent value.",
    imageUrl: "https://images.unsplash.com/photo-1585464231875-d9ef1f5ad396?auto=format&fit=crop&w=1400&q=80",
    costLevel: 2,
    trendingScore: 96,
    bestFor: ["food", "nightlife", "museums", "budget"],
    averageNightlyHotel: 125,
    averageDailyFood: 45,
    averageDailyActivities: 38,
    bookingLink: "https://www.google.com/travel/explore?q=Mexico%20City"
  },
  {
    id: "kyoto",
    name: "Kyoto",
    country: "Japan",
    summary: "Temples, gardens, compact neighborhoods, train access, and a slower cultural rhythm.",
    imageUrl: "https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&w=1400&q=80",
    costLevel: 3,
    trendingScore: 91,
    bestFor: ["museums", "food", "family", "nature"],
    averageNightlyHotel: 175,
    averageDailyFood: 65,
    averageDailyActivities: 48,
    bookingLink: "https://www.google.com/travel/explore?q=Kyoto%20Japan"
  },
  {
    id: "tokyo",
    name: "Tokyo",
    country: "Japan",
    summary: "Layered neighborhoods, exceptional food, design, museums, nightlife, and seamless rail access.",
    imageUrl: "https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?auto=format&fit=crop&w=1400&q=80",
    costLevel: 4,
    trendingScore: 97,
    bestFor: ["food", "nightlife", "museums", "family"],
    averageNightlyHotel: 215,
    averageDailyFood: 78,
    averageDailyActivities: 62,
    bookingLink: "https://www.google.com/travel/explore?q=Tokyo%20Japan"
  },
  {
    id: "vancouver",
    name: "Vancouver",
    country: "Canada",
    summary: "Coastal city access to mountains, parks, seafood, neighborhoods, and polished urban comfort.",
    imageUrl: "https://images.unsplash.com/photo-1559511260-66a654ae982a?auto=format&fit=crop&w=1400&q=80",
    costLevel: 4,
    trendingScore: 87,
    bestFor: ["nature", "food", "adventure", "family"],
    averageNightlyHotel: 235,
    averageDailyFood: 85,
    averageDailyActivities: 70,
    bookingLink: "https://www.google.com/travel/explore?q=Vancouver%20Canada"
  },
  {
    id: "san-diego",
    name: "San Diego",
    country: "United States",
    summary: "Beaches, neighborhoods, family-friendly attractions, tacos, and easy coastal drives.",
    imageUrl: "https://images.unsplash.com/photo-1501594907352-04cda38ebc29?auto=format&fit=crop&w=1400&q=80",
    costLevel: 4,
    trendingScore: 85,
    bestFor: ["beaches", "family", "food", "adventure"],
    averageNightlyHotel: 220,
    averageDailyFood: 78,
    averageDailyActivities: 68,
    bookingLink: "https://www.google.com/travel/explore?q=San%20Diego"
  },
  {
    id: "marrakesh",
    name: "Marrakesh",
    country: "Morocco",
    summary: "Markets, courtyard stays, desert day trips, gardens, and strong value for immersive travel.",
    imageUrl: "https://images.unsplash.com/photo-1548018560-c7196548e84d?auto=format&fit=crop&w=1400&q=80",
    costLevel: 2,
    trendingScore: 89,
    bestFor: ["adventure", "food", "museums", "budget"],
    averageNightlyHotel: 105,
    averageDailyFood: 38,
    averageDailyActivities: 35,
    bookingLink: "https://www.google.com/travel/explore?q=Marrakesh%20Morocco"
  },
  {
    id: "barcelona",
    name: "Barcelona",
    country: "Spain",
    summary: "Architecture, beaches, late dining, markets, and walkable neighborhoods with strong transit.",
    imageUrl: "https://images.unsplash.com/photo-1539037116277-4db20889f2d4?auto=format&fit=crop&w=1400&q=80",
    costLevel: 3,
    trendingScore: 90,
    bestFor: ["food", "nightlife", "beaches", "museums"],
    averageNightlyHotel: 185,
    averageDailyFood: 72,
    averageDailyActivities: 58,
    bookingLink: "https://www.google.com/travel/explore?q=Barcelona%20Spain"
  },
  {
    id: "seoul",
    name: "Seoul",
    country: "South Korea",
    summary: "Street food, design districts, palaces, nightlife, shopping, and excellent public transit.",
    imageUrl: "https://images.unsplash.com/photo-1538485399081-7c8edfb4929a?auto=format&fit=crop&w=1400&q=80",
    costLevel: 3,
    trendingScore: 93,
    bestFor: ["food", "nightlife", "museums", "budget"],
    averageNightlyHotel: 155,
    averageDailyFood: 56,
    averageDailyActivities: 45,
    bookingLink: "https://www.google.com/travel/explore?q=Seoul%20South%20Korea"
  },
  {
    id: "singapore",
    name: "Singapore",
    country: "Singapore",
    summary: "Hawker centers, gardens, skyline hotels, family attractions, and efficient transit.",
    imageUrl: "https://images.unsplash.com/photo-1525625293386-3f8f99389edd?auto=format&fit=crop&w=1400&q=80",
    costLevel: 4,
    trendingScore: 90,
    bestFor: ["food", "family", "luxury", "museums"],
    averageNightlyHotel: 230,
    averageDailyFood: 74,
    averageDailyActivities: 70,
    bookingLink: "https://www.google.com/travel/explore?q=Singapore"
  },
  {
    id: "hong-kong",
    name: "Hong Kong",
    country: "Hong Kong",
    summary: "Harbor views, dim sum, markets, hikes, dense neighborhoods, and excellent transit.",
    imageUrl: "https://images.unsplash.com/photo-1536599018102-9f803c140fc1?auto=format&fit=crop&w=1400&q=80",
    costLevel: 4,
    trendingScore: 88,
    bestFor: ["food", "nightlife", "museums", "nature"],
    averageNightlyHotel: 220,
    averageDailyFood: 76,
    averageDailyActivities: 64,
    bookingLink: "https://www.google.com/travel/explore?q=Hong%20Kong"
  },
  {
    id: "london",
    name: "London",
    country: "United Kingdom",
    summary: "World-class museums, restaurants, theater, markets, parks, and neighborhood hopping.",
    imageUrl: "https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?auto=format&fit=crop&w=1400&q=80",
    costLevel: 5,
    trendingScore: 92,
    bestFor: ["museums", "food", "nightlife", "luxury"],
    averageNightlyHotel: 290,
    averageDailyFood: 98,
    averageDailyActivities: 85,
    bookingLink: "https://www.google.com/travel/explore?q=London%20United%20Kingdom"
  },
  {
    id: "paris",
    name: "Paris",
    country: "France",
    summary: "Museums, bakeries, restaurants, iconic walks, boutiques, and polished city breaks.",
    imageUrl: "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&w=1400&q=80",
    costLevel: 5,
    trendingScore: 91,
    bestFor: ["museums", "food", "luxury", "family"],
    averageNightlyHotel: 275,
    averageDailyFood: 94,
    averageDailyActivities: 82,
    bookingLink: "https://www.google.com/travel/explore?q=Paris%20France"
  },
  {
    id: "rome",
    name: "Rome",
    country: "Italy",
    summary: "Ancient sites, trattorias, piazzas, museums, churches, and easy day trips.",
    imageUrl: "https://images.unsplash.com/photo-1552832230-c0197dd311b5?auto=format&fit=crop&w=1400&q=80",
    costLevel: 4,
    trendingScore: 89,
    bestFor: ["food", "museums", "family", "nightlife"],
    averageNightlyHotel: 210,
    averageDailyFood: 78,
    averageDailyActivities: 66,
    bookingLink: "https://www.google.com/travel/explore?q=Rome%20Italy"
  },
  {
    id: "istanbul",
    name: "Istanbul",
    country: "Turkiye",
    summary: "Bazaars, ferries, mosques, layered history, street food, and strong value.",
    imageUrl: "https://images.unsplash.com/photo-1524231757912-21f4fe3a7200?auto=format&fit=crop&w=1400&q=80",
    costLevel: 2,
    trendingScore: 91,
    bestFor: ["food", "museums", "budget", "nightlife"],
    averageNightlyHotel: 115,
    averageDailyFood: 42,
    averageDailyActivities: 34,
    bookingLink: "https://www.google.com/travel/explore?q=Istanbul%20Turkiye"
  },
  {
    id: "bangkok",
    name: "Bangkok",
    country: "Thailand",
    summary: "Markets, temples, rooftop views, river travel, and one of the world's strongest food scenes.",
    imageUrl: "https://images.unsplash.com/photo-1508009603885-50cf7c579365?auto=format&fit=crop&w=1400&q=80",
    costLevel: 2,
    trendingScore: 95,
    bestFor: ["food", "nightlife", "budget", "museums"],
    averageNightlyHotel: 95,
    averageDailyFood: 34,
    averageDailyActivities: 32,
    bookingLink: "https://www.google.com/travel/explore?q=Bangkok%20Thailand"
  },
  {
    id: "new-orleans",
    name: "New Orleans",
    country: "United States",
    summary: "Live music, Creole food, historic streets, festivals, and compact neighborhood exploring.",
    imageUrl: "https://images.unsplash.com/photo-1508726096737-5ac7ca26345d?auto=format&fit=crop&w=1400&q=80",
    costLevel: 3,
    trendingScore: 86,
    bestFor: ["food", "nightlife", "museums", "family"],
    averageNightlyHotel: 170,
    averageDailyFood: 68,
    averageDailyActivities: 48,
    bookingLink: "https://www.google.com/travel/explore?q=New%20Orleans"
  },
  {
    id: "new-york",
    name: "New York",
    country: "United States",
    summary: "Museums, food halls, neighborhoods, theater, parks, nightlife, and nonstop transit access.",
    imageUrl: "https://images.unsplash.com/photo-1485871981521-5b1fd3805eee?auto=format&fit=crop&w=1400&q=80",
    costLevel: 5,
    trendingScore: 93,
    bestFor: ["food", "museums", "nightlife", "luxury"],
    averageNightlyHotel: 310,
    averageDailyFood: 105,
    averageDailyActivities: 90,
    bookingLink: "https://www.google.com/travel/explore?q=New%20York"
  },
  {
    id: "los-angeles",
    name: "Los Angeles",
    country: "United States",
    summary: "Beaches, food neighborhoods, studios, museums, hikes, and car-friendly exploring.",
    imageUrl: "https://images.unsplash.com/photo-1534190760961-74e8c1c5c3da?auto=format&fit=crop&w=1400&q=80",
    costLevel: 5,
    trendingScore: 86,
    bestFor: ["food", "beaches", "nightlife", "museums"],
    averageNightlyHotel: 260,
    averageDailyFood: 92,
    averageDailyActivities: 78,
    bookingLink: "https://www.google.com/travel/explore?q=Los%20Angeles"
  },
  {
    id: "miami",
    name: "Miami",
    country: "United States",
    summary: "Beaches, Latin food, nightlife, art districts, design hotels, and warm-weather escapes.",
    imageUrl: "https://images.unsplash.com/photo-1506966953602-c20cc11f75e3?auto=format&fit=crop&w=1400&q=80",
    costLevel: 4,
    trendingScore: 87,
    bestFor: ["beaches", "food", "nightlife", "luxury"],
    averageNightlyHotel: 240,
    averageDailyFood: 88,
    averageDailyActivities: 74,
    bookingLink: "https://www.google.com/travel/explore?q=Miami"
  },
  {
    id: "porto",
    name: "Porto",
    country: "Portugal",
    summary: "River views, wine lodges, tiled streets, seafood, and strong value in a compact city.",
    imageUrl: "https://images.unsplash.com/photo-1555881400-74d7acaacd8b?auto=format&fit=crop&w=1400&q=80",
    costLevel: 2,
    trendingScore: 88,
    bestFor: ["food", "budget", "museums", "nightlife"],
    averageNightlyHotel: 120,
    averageDailyFood: 48,
    averageDailyActivities: 36,
    bookingLink: "https://www.google.com/travel/explore?q=Porto%20Portugal"
  },
  {
    id: "prague",
    name: "Prague",
    country: "Czechia",
    summary: "Historic squares, beer halls, river walks, classical music, and good mid-range value.",
    imageUrl: "https://images.unsplash.com/photo-1519677100203-a0e668c92439?auto=format&fit=crop&w=1400&q=80",
    costLevel: 2,
    trendingScore: 84,
    bestFor: ["museums", "nightlife", "budget", "food"],
    averageNightlyHotel: 118,
    averageDailyFood: 42,
    averageDailyActivities: 34,
    bookingLink: "https://www.google.com/travel/explore?q=Prague%20Czechia"
  },
  {
    id: "reykjavik",
    name: "Reykjavik",
    country: "Iceland",
    summary: "Northern landscapes, day trips, lagoons, dramatic coastlines, and easy adventure access.",
    imageUrl: "https://images.unsplash.com/photo-1504829857797-ddff29c27927?auto=format&fit=crop&w=1400&q=80",
    costLevel: 5,
    trendingScore: 82,
    bestFor: ["nature", "adventure", "luxury", "family"],
    averageNightlyHotel: 285,
    averageDailyFood: 105,
    averageDailyActivities: 95,
    bookingLink: "https://www.google.com/travel/explore?q=Reykjavik%20Iceland"
  },
  {
    id: "cape-town",
    name: "Cape Town",
    country: "South Africa",
    summary: "Mountains, beaches, wine country, markets, design, and adventure at flexible price points.",
    imageUrl: "https://images.unsplash.com/photo-1580060839134-75a5edca2e99?auto=format&fit=crop&w=1400&q=80",
    costLevel: 3,
    trendingScore: 89,
    bestFor: ["nature", "food", "adventure", "beaches"],
    averageNightlyHotel: 135,
    averageDailyFood: 46,
    averageDailyActivities: 50,
    bookingLink: "https://www.google.com/travel/explore?q=Cape%20Town%20South%20Africa"
  },
  {
    id: "buenos-aires",
    name: "Buenos Aires",
    country: "Argentina",
    summary: "Steakhouses, cafes, tango, bookstores, architecture, and excellent value for long stays.",
    imageUrl: "https://images.unsplash.com/photo-1589909202802-8f4aadce1849?auto=format&fit=crop&w=1400&q=80",
    costLevel: 2,
    trendingScore: 87,
    bestFor: ["food", "nightlife", "museums", "budget"],
    averageNightlyHotel: 90,
    averageDailyFood: 36,
    averageDailyActivities: 28,
    bookingLink: "https://www.google.com/travel/explore?q=Buenos%20Aires%20Argentina"
  },
  {
    id: "queenstown",
    name: "Queenstown",
    country: "New Zealand",
    summary: "Lake views, alpine hikes, wine trails, road trips, and high-adrenaline outdoor days.",
    imageUrl: "https://images.unsplash.com/photo-1528159474961-926f29decc6d?auto=format&fit=crop&w=1400&q=80",
    costLevel: 4,
    trendingScore: 83,
    bestFor: ["adventure", "nature", "luxury", "family"],
    averageNightlyHotel: 225,
    averageDailyFood: 82,
    averageDailyActivities: 92,
    bookingLink: "https://www.google.com/travel/explore?q=Queenstown%20New%20Zealand"
  },
  {
    id: "amsterdam",
    name: "Amsterdam",
    country: "Netherlands",
    summary: "Canals, museums, cycling, design hotels, markets, and easy rail connections.",
    imageUrl: "https://images.unsplash.com/photo-1512470876302-972faa2aa9a4?auto=format&fit=crop&w=1400&q=80",
    costLevel: 4,
    trendingScore: 88,
    bestFor: ["museums", "food", "nightlife", "luxury"],
    averageNightlyHotel: 245,
    averageDailyFood: 86,
    averageDailyActivities: 72,
    bookingLink: "https://www.google.com/travel/explore?q=Amsterdam%20Netherlands"
  },
  {
    id: "dubai",
    name: "Dubai",
    country: "United Arab Emirates",
    summary: "Luxury hotels, beaches, desert outings, restaurants, malls, and bold architecture.",
    imageUrl: "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?auto=format&fit=crop&w=1400&q=80",
    costLevel: 5,
    trendingScore: 88,
    bestFor: ["luxury", "food", "family", "beaches"],
    averageNightlyHotel: 285,
    averageDailyFood: 95,
    averageDailyActivities: 90,
    bookingLink: "https://www.google.com/travel/explore?q=Dubai"
  },
  {
    id: "sydney",
    name: "Sydney",
    country: "Australia",
    summary: "Harbor walks, beaches, dining, museums, ferry rides, and easy coastal day trips.",
    imageUrl: "https://images.unsplash.com/photo-1506973035872-a4ec16b8e8d9?auto=format&fit=crop&w=1400&q=80",
    costLevel: 5,
    trendingScore: 86,
    bestFor: ["beaches", "food", "nature", "family"],
    averageNightlyHotel: 260,
    averageDailyFood: 92,
    averageDailyActivities: 78,
    bookingLink: "https://www.google.com/travel/explore?q=Sydney%20Australia"
  },
  {
    id: "athens",
    name: "Athens",
    country: "Greece",
    summary: "Ancient sites, rooftop dining, neighborhood cafes, museums, and island connections.",
    imageUrl: "https://images.unsplash.com/photo-1555993539-1732b0258235?auto=format&fit=crop&w=1400&q=80",
    costLevel: 3,
    trendingScore: 87,
    bestFor: ["museums", "food", "budget", "beaches"],
    averageNightlyHotel: 145,
    averageDailyFood: 58,
    averageDailyActivities: 46,
    bookingLink: "https://www.google.com/travel/explore?q=Athens%20Greece"
  },
  {
    id: "rio-de-janeiro",
    name: "Rio de Janeiro",
    country: "Brazil",
    summary: "Beaches, viewpoints, music, nightlife, casual food, and dramatic nature in the city.",
    imageUrl: "https://images.unsplash.com/photo-1483729558449-99ef09a8c325?auto=format&fit=crop&w=1400&q=80",
    costLevel: 3,
    trendingScore: 85,
    bestFor: ["beaches", "nightlife", "nature", "food"],
    averageNightlyHotel: 135,
    averageDailyFood: 48,
    averageDailyActivities: 44,
    bookingLink: "https://www.google.com/travel/explore?q=Rio%20de%20Janeiro%20Brazil"
  },
  {
    id: "cartagena",
    name: "Cartagena",
    country: "Colombia",
    summary: "Colorful old town streets, Caribbean beaches, seafood, nightlife, and island day trips.",
    imageUrl: "https://images.unsplash.com/photo-1588583298440-648835fdb3e6?auto=format&fit=crop&w=1400&q=80",
    costLevel: 2,
    trendingScore: 86,
    bestFor: ["beaches", "food", "nightlife", "budget"],
    averageNightlyHotel: 110,
    averageDailyFood: 39,
    averageDailyActivities: 36,
    bookingLink: "https://www.google.com/travel/explore?q=Cartagena%20Colombia"
  }
];

export function hotelsFor(destination: DestinationOption, request?: TripRequest): HotelOption[] {
  const destinationText = destinationLabel(destination);
  const searchText = hotelSearchText(destination, request);
  return [
    {
      id: `${destination.id}-hotel-1`,
      name: `${destination.name} Central House`,
      location: `Central ${destination.name}`,
      nightlyPrice: Math.round(destination.averageNightlyHotel * 0.92),
      rating: 4.4,
      source: "Fallback hotel index",
      link: `https://www.google.com/travel/hotels?q=${encodeURIComponent(searchText)}`,
      confidence: 0.72
    },
    {
      id: `${destination.id}-hotel-2`,
      name: `${destination.name} Design Stay`,
      location: "Dining district",
      nightlyPrice: Math.round(destination.averageNightlyHotel * 1.18),
      rating: 4.6,
      source: "Fallback hotel index",
      link: bookingHotelLink(destinationText, request),
      confidence: 0.7
    },
    {
      id: `${destination.id}-hotel-3`,
      name: `${destination.name} Value Rooms`,
      location: "Transit-friendly area",
      nightlyPrice: Math.round(destination.averageNightlyHotel * 0.72),
      rating: 4.1,
      source: "Fallback hotel index",
      link: `https://www.google.com/search?q=${encodeURIComponent(`${searchText} budget hotels`)}`,
      confidence: 0.67
    }
  ];
}

export function flightQuotesFor(destination: DestinationOption, request: TripRequest): PriceQuote[] {
  const route = flightSearchText(destination, request);
  const base = Math.round((destination.costLevel * 115 + destination.trendingScore * 2.4) * request.travelers);
  const providers = [
    { provider: "google-flights", displayName: "Google Flights", factor: 0.96, link: `https://www.google.com/travel/flights?q=${encodeURIComponent(route)}`, linkLabel: "Exact flight search" },
    { provider: "kayak", displayName: "KAYAK", factor: 1.02, link: `https://www.kayak.com/flights`, linkLabel: "Open provider search" },
    { provider: "expedia", displayName: "Expedia", factor: 1.08, link: `https://www.expedia.com/Flights`, linkLabel: "Open provider search" },
    { provider: "skyscanner", displayName: "Skyscanner", factor: 0.99, link: `https://www.skyscanner.com/transport/flights/`, linkLabel: "Open provider search" }
  ];

  return providers.map((item) => ({
    id: `${destination.id}-flight-${item.provider}`,
    category: "flight",
    provider: item.provider,
    displayName: item.displayName,
    estimatedPrice: Math.max(120, Math.round(base * item.factor)),
    unit: "round-trip",
    link: item.link,
    source: "fallback",
    confidence: 0.58,
    lastChecked: new Date().toISOString(),
    linkLabel: item.linkLabel
  }));
}

export function hotelMarketQuotesFor(destination: DestinationOption, request?: TripRequest): PriceQuote[] {
  const destinationText = destinationLabel(destination);
  const searchText = hotelSearchText(destination, request);
  const providers = [
    { provider: "google-hotels", displayName: "Google Hotels", factor: 0.97, link: `https://www.google.com/travel/hotels?q=${encodeURIComponent(searchText)}`, linkLabel: "Exact hotel search" },
    { provider: "booking", displayName: "Booking.com", factor: 1.03, link: bookingHotelLink(destinationText, request), linkLabel: hasExactDates(request) ? "Exact hotel search" : "Open hotel search" },
    { provider: "expedia", displayName: "Expedia", factor: 1.07, link: `https://www.expedia.com/Hotel-Search?destination=${encodeURIComponent(destinationText)}`, linkLabel: "Open provider search" },
    { provider: "hotels", displayName: "Hotels.com", factor: 1.01, link: `https://www.hotels.com/Hotel-Search?destination=${encodeURIComponent(destinationText)}`, linkLabel: "Open provider search" },
    { provider: "tripadvisor", displayName: "Tripadvisor", factor: 0.94, link: `https://www.tripadvisor.com/Search?q=${encodeURIComponent(searchText)}`, linkLabel: "Open hotel search" }
  ];

  return providers.map((item) => ({
    id: `${destination.id}-hotel-market-${item.provider}`,
    category: "hotel",
    provider: item.provider,
    displayName: item.displayName,
    estimatedPrice: Math.max(55, Math.round(destination.averageNightlyHotel * item.factor)),
    unit: "night",
    link: item.link,
    source: "fallback",
    confidence: 0.6,
    lastChecked: new Date().toISOString(),
    linkLabel: item.linkLabel
  }));
}

export function carsFor(destination: DestinationOption): CarOption[] {
  const base = destination.costLevel >= 4 ? 68 : destination.costLevel === 3 ? 52 : 39;
  return [
    {
      id: `${destination.id}-car-1`,
      name: "Compact rental",
      pickupLocation: `${destination.name} airport or central station`,
      dailyPrice: base,
      rating: 4.2,
      source: "Fallback transport index",
      link: `https://www.kayak.com/cars?query=${encodeURIComponent(destinationLabel(destination))}`,
      confidence: 0.64
    },
    {
      id: `${destination.id}-car-2`,
      name: "Transit and rideshare allowance",
      pickupLocation: destination.name,
      dailyPrice: Math.round(base * 0.58),
      rating: 4.0,
      source: "Fallback transport index",
      link: `https://www.google.com/search?q=${encodeURIComponent(`${destinationLabel(destination)} public transit visitor pass`)}`,
      confidence: 0.68
    }
  ];
}

export function restaurantsFor(destination: DestinationOption): RestaurantOption[] {
  const searchText = destinationLabel(destination);
  return ["Market Table", "Neighborhood Grill", "Late Kitchen", "Local Bakery"].map((suffix, index) => ({
    id: `${destination.id}-restaurant-${index + 1}`,
    name: `${destination.name} ${suffix}`,
    cuisine: index === 0 ? "local market" : index === 1 ? "regional" : index === 2 ? "modern casual" : "breakfast",
    neighborhood: index % 2 === 0 ? "Old town" : "Waterfront district",
    averageMealPrice: Math.round(destination.averageDailyFood * (index === 2 ? 0.62 : 0.42)),
    rating: 4.2 + index * 0.1,
    source: "Fallback restaurant index",
    link: `https://www.google.com/search?q=${encodeURIComponent(`${searchText} best restaurants`)}`,
    confidence: 0.65
  }));
}

export function attractionsFor(destination: DestinationOption): AttractionOption[] {
  const searchText = destinationLabel(destination);
  const categories: Interest[] = destination.bestFor.length ? destination.bestFor : ["food", "museums", "nature"];
  return categories.slice(0, 4).map((category, index) => ({
    id: `${destination.id}-attraction-${index + 1}`,
    name: `${destination.name} ${category === "food" ? "tasting route" : category === "nature" ? "viewpoint circuit" : category === "beaches" ? "coast day" : `${category} highlight`}`,
    category,
    estimatedPrice: Math.round(destination.averageDailyActivities * (0.45 + index * 0.18)),
    durationHours: index === 0 ? 3 : 2,
    source: "Fallback attraction index",
    link: `https://www.google.com/search?q=${encodeURIComponent(`${searchText} ${category} things to do`)}`,
    confidence: 0.66
  }));
}

function flightSearchText(destination: DestinationOption, request: TripRequest) {
  return [`from ${request.origin} to ${destinationLabel(destination)}`, travelDateLabel(request, "flight")].filter(Boolean).join(" ");
}

function hotelSearchText(destination: DestinationOption, request?: TripRequest) {
  return [`${destinationLabel(destination)} hotels`, request ? travelDateLabel(request, "hotel") : ""].filter(Boolean).join(" ");
}

function destinationLabel(destination: DestinationOption) {
  return destination.country && destination.country !== "Global destination" ? `${destination.name}, ${destination.country}` : destination.name;
}

function travelDateLabel(request: TripRequest, category: "flight" | "hotel") {
  const exact = exactDateRange(request);
  if (exact) {
    const start = formatDateLabel(exact.startDate);
    const end = formatDateLabel(exact.endDate);
    return category === "flight" ? `depart ${start} return ${end}` : `check-in ${start} check-out ${end}`;
  }
  const value = request.startDate?.trim();
  if (!value) return "";
  const monthMatch = /^(\d{4})-(\d{2})$/.exec(value);
  if (!monthMatch) return value;
  const [, year, month] = monthMatch;
  const date = new Date(Date.UTC(Number(year), Number(month) - 1, 1));
  return date.toLocaleString("en-US", { month: "long", year: "numeric", timeZone: "UTC" });
}

function bookingHotelLink(destination: string, request?: TripRequest) {
  const url = new URL("https://www.booking.com/searchresults.html");
  url.searchParams.set("ss", destination);
  const exact = request ? exactDateRange(request) : null;
  if (exact) {
    url.searchParams.set("checkin", exact.startDate);
    url.searchParams.set("checkout", exact.endDate);
    url.searchParams.set("group_adults", String(request?.travelers ?? 2));
    url.searchParams.set("no_rooms", String(Math.max(1, Math.ceil((request?.travelers ?? 2) / 2))));
  }
  return url.toString();
}

function hasExactDates(request?: TripRequest) {
  return Boolean(request && exactDateRange(request));
}

function exactDateRange(request: TripRequest) {
  const startDate = request.startDate;
  if (request.dateMode !== "exact" || !isDateOnly(startDate)) return null;
  return {
    startDate,
    endDate: isDateOnly(request.endDate) ? request.endDate : addDays(startDate, Math.max(0, request.tripLengthDays - 1))
  };
}

function formatDateLabel(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day)).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
}

function addDays(value: string, days: number) {
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function isDateOnly(value?: string): value is string {
  return Boolean(value && /^\d{4}-\d{2}-\d{2}$/.test(value));
}
