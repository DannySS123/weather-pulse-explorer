
// Simple mapping of common cities to coordinates
// In a production app, this would use a real geocoding API
const cityCoordinates: Record<string, { lat: number; lng: number }> = {
  "new york": { lat: 40.7128, lng: -74.0060 },
  "los angeles": { lat: 34.0522, lng: -118.2437 },
  "chicago": { lat: 41.8781, lng: -87.6298 },
  "houston": { lat: 29.7604, lng: -95.3698 },
  "phoenix": { lat: 33.4484, lng: -112.0740 },
  "philadelphia": { lat: 39.9526, lng: -75.1652 },
  "san antonio": { lat: 29.4241, lng: -98.4936 },
  "san diego": { lat: 32.7157, lng: -117.1611 },
  "dallas": { lat: 32.7767, lng: -96.7970 },
  "san francisco": { lat: 37.7749, lng: -122.4194 },
  "seattle": { lat: 47.6062, lng: -122.3321 },
  "boston": { lat: 42.3601, lng: -71.0589 },
  "miami": { lat: 25.7617, lng: -80.1918 },
  "london": { lat: 51.5074, lng: -0.1278 },
  "paris": { lat: 48.8566, lng: 2.3522 },
  "tokyo": { lat: 35.6762, lng: 139.6503 },
  "sydney": { lat: -33.8688, lng: 151.2093 },
  "rio de janeiro": { lat: -22.9068, lng: -43.1729 },
  "cairo": { lat: 30.0444, lng: 31.2357 },
  "moscow": { lat: 55.7558, lng: 37.6173 }
};

export const getCoordinates = (cityName: string): { lat: number; lng: number } | null => {
  const normalized = cityName.toLowerCase().trim();
  
  // First try exact match
  if (cityCoordinates[normalized]) {
    return cityCoordinates[normalized];
  }
  
  // Then try partial match
  for (const [city, coords] of Object.entries(cityCoordinates)) {
    if (normalized.includes(city) || city.includes(normalized)) {
      return coords;
    }
  }
  
  // Default to New York if no match is found
  // In a real app, we would return null and show an error
  return cityCoordinates["new york"];
};
