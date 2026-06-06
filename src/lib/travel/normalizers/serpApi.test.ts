import { describe, expect, it } from "vitest";
import { normalizeSerpFlight } from "./normalizeSerpFlight";
import { normalizeSerpHotel } from "./normalizeSerpHotel";

const fetchedAt = "2026-06-06T12:00:00.000Z";

describe("SerpApi normalizers", () => {
  it("maps Google Flights groups without inventing prices or tokens", () => {
    const flight = normalizeSerpFlight(
      {
        price: 640,
        total_duration: 455,
        type: "Round trip",
        airline_logo: "https://example.com/group.png",
        extensions: ["Carry-on bag"],
        booking_token: "book-token",
        flights: [
          {
            airline: "Air Canada",
            airline_logo: "https://example.com/ac.png",
            flight_number: "AC 800",
            travel_class: "Economy",
            departure_airport: { id: "YYZ", time: "2026-07-10 20:10" },
            arrival_airport: { id: "LIS", time: "2026-07-11 08:45" }
          }
        ]
      },
      0,
      {
        origin: "YYZ",
        destination: "LIS",
        departureDate: "2026-07-10",
        returnDate: "2026-07-17",
        adults: 2,
        currency: "CAD",
        sourceUrl: "https://www.google.com/travel/flights",
        fetchedAt
      }
    );

    expect(flight).toMatchObject({
      source: "SerpApi Google Flights",
      sourceUrl: "https://www.google.com/travel/flights",
      airlineName: "Air Canada",
      pricePerTraveler: 640,
      totalPrice: 640,
      cabin: "Economy",
      baggage: ["Carry-on bag"],
      bookingToken: "book-token",
      fetchedAt
    });
  });

  it("maps Google Hotels properties with property tokens and live price flags", () => {
    const hotel = normalizeSerpHotel(
      {
        name: "Memmo Alfama",
        link: "https://example.com/hotel",
        property_token: "property-token",
        gps_coordinates: { latitude: 38.71, longitude: -9.13 },
        extracted_hotel_class: 4,
        overall_rating: 4.7,
        reviews: 1100,
        amenities: ["Free Wi-Fi"],
        rate_per_night: { extracted_lowest: 210 },
        total_rate: { extracted_lowest: 840 },
        images: [{ thumbnail: "https://example.com/hotel.jpg" }]
      },
      0,
      { destination: "Lisbon", currency: "CAD", fetchedAt }
    );

    expect(hotel).toMatchObject({
      source: "SerpApi Google Hotels",
      sourceUrl: "https://example.com/hotel",
      propertyToken: "property-token",
      name: "Memmo Alfama",
      imageUrl: "https://example.com/hotel.jpg",
      pricePerNight: 210,
      totalPrice: 840,
      isLivePrice: true,
      fetchedAt
    });
  });
});
