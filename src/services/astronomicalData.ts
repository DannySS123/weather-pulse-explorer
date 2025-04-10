
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

export const fetchSunriseSunsetData = async (
  latitude: number,
  longitude: number,
  date: string
): Promise<{ data: any; source: string } | null> => {
  try {
    // Try the primary API first (sunrise-sunset.org)
    const sunriseResponse = await fetch(
      `https://api.sunrise-sunset.org/json?lat=${latitude}&lng=${longitude}&date=${date}&formatted=0`
    );
    
    if (sunriseResponse.ok) {
      const data = await sunriseResponse.json() as SunriseSunsetApiResponse;
      
      if (data.status === "OK") {
        return {
          data: {
            sunrise: data.results.sunrise,
            sunset: data.results.sunset,
            day_length: data.results.day_length,
            solar_noon: data.results.solar_noon
          },
          source: "sunrise-sunset.org"
        };
      }
    }
    
    throw new Error("Primary API failed");
  } catch (error) {
    // If primary API fails, try the backup API (sunrisesunset.io)
    try {
      const formattedDate = date.replace(/-/g, "/");
      const backupResponse = await fetch(
        `https://api.sunrisesunset.io/json?lat=${latitude}&lng=${longitude}&date=${formattedDate}`
      );
      
      if (backupResponse.ok) {
        const data = await backupResponse.json() as SunriseSunsetIoApiResponse;
        
        if (data.status === "OK") {
          // Convert day_length from "HH:MM:SS" to seconds
          const [hours, minutes, seconds] = data.day_length.split(':').map(Number);
          const dayLengthSeconds = (hours * 3600) + (minutes * 60) + seconds;
          
          return {
            data: {
              sunrise: new Date(`${date}T${data.sunrise}${data.utc_offset >= 0 ? '+' : '-'}${Math.abs(data.utc_offset)}:00`).toISOString(),
              sunset: new Date(`${date}T${data.sunset}${data.utc_offset >= 0 ? '+' : '-'}${Math.abs(data.utc_offset)}:00`).toISOString(),
              day_length: dayLengthSeconds,
              solar_noon: new Date(`${date}T${data.solar_noon}${data.utc_offset >= 0 ? '+' : '-'}${Math.abs(data.utc_offset)}:00`).toISOString()
            },
            source: "sunrisesunset.io"
          };
        }
      }
      
      throw new Error("Backup API failed");
    } catch (backupError) {
      console.error("Error fetching data from both APIs:", backupError);
      toast({
        title: "API Error",
        description: "Failed to fetch data from astronomical APIs",
        variant: "destructive",
      });
      return null;
    }
  }
};
