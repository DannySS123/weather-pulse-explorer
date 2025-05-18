import { toast } from "@/components/ui/use-toast";

//Fallback data for common cities
const cityCoordinates: Record<string, { lat: number; lng: number }> = {
  "new york": { lat: 40.7128, lng: -74.006 },
  "los angeles": { lat: 34.0522, lng: -118.2437 },
  chicago: { lat: 41.8781, lng: -87.6298 },
  houston: { lat: 29.7604, lng: -95.3698 },
  phoenix: { lat: 33.4484, lng: -112.074 },
  philadelphia: { lat: 39.9526, lng: -75.1652 },
  "san antonio": { lat: 29.4241, lng: -98.4936 },
  "san diego": { lat: 32.7157, lng: -117.1611 },
  dallas: { lat: 32.7767, lng: -96.797 },
  "san francisco": { lat: 37.7749, lng: -122.4194 },
  seattle: { lat: 47.6062, lng: -122.3321 },
  boston: { lat: 42.3601, lng: -71.0589 },
  miami: { lat: 25.7617, lng: -80.1918 },
  london: { lat: 51.5074, lng: -0.1278 },
  paris: { lat: 48.8566, lng: 2.3522 },
  tokyo: { lat: 35.6762, lng: 139.6503 },
  sydney: { lat: -33.8688, lng: 151.2093 },
  "rio de janeiro": { lat: -22.9068, lng: -43.1729 },
  cairo: { lat: 30.0444, lng: 31.2357 },
  moscow: { lat: 55.7558, lng: 37.6173 },
};

export const getCoordinates = async (
  cityName: string
): Promise<{ lat: number; lng: number } | null> => {
  const normalized = cityName.toLowerCase().trim();

  if (cityCoordinates[normalized]) {
    return cityCoordinates[normalized];
  }

  try {
    //Nominatim API (OpenStreetMap)
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
        cityName
      )}&limit=1`
    );

    if (!response.ok) {
      throw new Error(`Geocoding API error: ${response.status}`);
    }

    const data = await response.json();

    if (data && data.length > 0) {
      const coords = {
        lat: parseFloat(data[0].lat),
        lng: parseFloat(data[0].lon),
      };
      console.log("Fetched coordinates:", coords);

      return coords;
    }

    for (const [city, coords] of Object.entries(cityCoordinates)) {
      if (normalized.includes(city) || city.includes(normalized)) {
        return coords;
      }
    }

    toast({
      title: "City Not Found",
      description: `Could not find coordinates for "${cityName}"`,
      variant: "destructive",
    });

    return null;
  } catch (error) {
    console.error("Geocoding error:", error);

    for (const [city, coords] of Object.entries(cityCoordinates)) {
      if (normalized.includes(city) || city.includes(normalized)) {
        return coords;
      }
    }

    toast({
      title: "Geocoding Error",
      description:
        "Could not connect to geocoding service. Using fallback data.",
      variant: "destructive",
    });

    return null;
  }
};
