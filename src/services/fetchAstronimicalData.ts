import { toast } from "@/components/ui/use-toast";

interface SunriseSunsetApiResponse {
  results: {
    sunrise: string;
    sunset: string;
    solar_noon: string;
    day_length: number;
    civil_twilight_begin: string;
    civil_twilight_end: string;
    nautical_twilight_begin: string;
    nautical_twilight_end: string;
    astronomical_twilight_begin: string;
    astronomical_twilight_end: string;
  };
  status: string;
}

interface SunriseSunsetIoApiResponse {
  results: {
    date: string;
    sunrise: string;
    sunset: string;
    first_light: string;
    last_light: string;
    dawn: string;
    dusk: string;
    solar_noon: string;
    golden_hour: string;
    day_length: string;
    timezone: string;
    utc_offset: number;
  };
  status: string;
}

export interface AstronomicalDataResult {
  data: {
    sunrise: string;
    sunset: string;
    day_length: number;
    solar_noon: string;
  };
  source: string;
}

export const fetchAstronimicalData = async (
  latitude: number,
  longitude: number,
  date: string
): Promise<AstronomicalDataResult[]> => {
  const results: AstronomicalDataResult[] = [];

  // Start both API requests simultaneously
  const sunriseSunsetOrgPromise = fetch(
    `https://api.sunrise-sunset.org/json?lat=${latitude}&lng=${longitude}&date=${date}&formatted=0`
  );

  const formattedDate = date.replace(/-/g, "/");
  const sunriseSunsetIoPromise = fetch(
    `https://api.sunrisesunset.io/json?lat=${latitude}&lng=${longitude}&date=${formattedDate}`
  );

  // Process sunrise-sunset.org API response
  try {
    const response = await sunriseSunsetOrgPromise;

    if (response.ok) {
      const data = (await response.json()) as SunriseSunsetApiResponse;

      if (data.status === "OK") {
        results.push({
          data: {
            sunrise: data.results.sunrise,
            sunset: data.results.sunset,
            day_length: data.results.day_length,
            solar_noon: data.results.solar_noon,
          },
          source: "sunrise-sunset.org",
        });
      }
    }
  } catch (error) {
    console.error("Error fetching data from sunrise-sunset.org API:", error);
  }

  // Process sunrisesunset.io API response (separately so one failure doesn't affect the other)
  try {
    const response = await sunriseSunsetIoPromise;

    if (response.ok) {
      const data = (await response.json()) as SunriseSunsetIoApiResponse;

      if (data.status === "OK") {
        // Convert day_length from "HH:MM:SS" to seconds
        const [hours, minutes, seconds] = data.results.day_length
          .split(":")
          .map(Number);
        const dayLengthSeconds = hours * 3600 + minutes * 60 + seconds;

        // Helper function to parse "hh:mm:ss AM/PM" to Date using base date
        const parseTime = (baseDateStr, timeStr) => {
          const [timePart, modifier] = timeStr.split(" ");
          // eslint-disable-next-line prefer-const
          let [h, m, s] = timePart.split(":").map(Number);

          if (modifier === "PM" && h !== 12) h += 12;
          if (modifier === "AM" && h === 12) h = 0;

          const date = new Date(`${baseDateStr}T00:00:00Z`);
          date.setUTCHours(h, m, s);
          return date;
        };

        const dateStr = data.results.date; // "2010-05-04"

        // Parse time values
        const sunriseDate = parseTime(dateStr, data.results.sunrise);
        const sunsetDate = parseTime(dateStr, data.results.sunset);
        const solarNoonDate = parseTime(dateStr, data.results.solar_noon);

        // Apply utc_offset (in minutes)
        const offsetMs = data.results.utc_offset * 60 * 1000;
        sunriseDate.setTime(sunriseDate.getTime() + offsetMs);
        sunsetDate.setTime(sunsetDate.getTime() + offsetMs);
        solarNoonDate.setTime(solarNoonDate.getTime() + offsetMs);

        results.push({
          data: {
            sunrise: sunriseDate.toISOString(),
            sunset: sunsetDate.toISOString(),
            day_length: dayLengthSeconds,
            solar_noon: solarNoonDate.toISOString(),
          },
          source: "sunrisesunset.io",
        });
      }
    }
  } catch (error) {
    console.error("Error fetching data from sunrisesunset.io API:", error);
  }

  if (results.length === 0) {
    toast({
      title: "API Error",
      description: "Failed to fetch data from astronomical APIs",
      variant: "destructive",
    });
  }

  return results;
};
