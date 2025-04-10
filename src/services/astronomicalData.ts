
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
  status: string;
}

interface AstronomicalDataResult {
  data: {
    sunrise: string;
    sunset: string;
    day_length: number;
    solar_noon: string;
  };
  source: string;
}

export const fetchSunriseSunsetData = async (
  latitude: number,
  longitude: number,
  date: string
): Promise<AstronomicalDataResult[]> => {
  const results: AstronomicalDataResult[] = [];
  
  try {
    // Start both API requests simultaneously
    const primaryApiPromise = fetch(
      `https://api.sunrise-sunset.org/json?lat=${latitude}&lng=${longitude}&date=${date}&formatted=0`
    );
    
    const formattedDate = date.replace(/-/g, "/");
    const backupApiPromise = fetch(
      `https://api.sunrisesunset.io/json?lat=${latitude}&lng=${longitude}&date=${formattedDate}`
    );
    
    // Wait for both promises to resolve
    const [primaryResponse, backupResponse] = await Promise.allSettled([
      primaryApiPromise,
      backupApiPromise
    ]);
    
    // Process primary API response
    if (primaryResponse.status === 'fulfilled' && primaryResponse.value.ok) {
      const data = await primaryResponse.value.json() as SunriseSunsetApiResponse;
      
      if (data.status === "OK") {
        results.push({
          data: {
            sunrise: data.results.sunrise,
            sunset: data.results.sunset,
            day_length: data.results.day_length,
            solar_noon: data.results.solar_noon
          },
          source: "sunrise-sunset.org"
        });
      }
    }
    
    // Process backup API response
    if (backupResponse.status === 'fulfilled' && backupResponse.value.ok) {
      const data = await backupResponse.value.json() as SunriseSunsetIoApiResponse;
      
      if (data.status === "OK") {
        // Convert day_length from "HH:MM:SS" to seconds
        const [hours, minutes, seconds] = data.day_length.split(':').map(Number);
        const dayLengthSeconds = (hours * 3600) + (minutes * 60) + seconds;
        
        results.push({
          data: {
            sunrise: new Date(`${date}T${data.sunrise}${data.utc_offset >= 0 ? '+' : '-'}${Math.abs(data.utc_offset)}:00`).toISOString(),
            sunset: new Date(`${date}T${data.sunset}${data.utc_offset >= 0 ? '+' : '-'}${Math.abs(data.utc_offset)}:00`).toISOString(),
            day_length: dayLengthSeconds,
            solar_noon: new Date(`${date}T${data.solar_noon}${data.utc_offset >= 0 ? '+' : '-'}${Math.abs(data.utc_offset)}:00`).toISOString()
          },
          source: "sunrisesunset.io"
        });
      }
    }
    
    if (results.length === 0) {
      toast({
        title: "API Error",
        description: "Failed to fetch data from astronomical APIs",
        variant: "destructive",
      });
    }
    
    return results;
  } catch (error) {
    console.error("Error fetching data from APIs:", error);
    toast({
      title: "API Error",
      description: "Failed to fetch data from astronomical APIs",
      variant: "destructive",
    });
    return [];
  }
};
