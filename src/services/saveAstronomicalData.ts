import { supabase } from "@/integrations/supabase/client";
import { AstronomicalDataResult } from "./fetchAstronimicalData";

export const saveAstronomicalData = async (
  apiResponses: AstronomicalDataResult[],
  location: string,
  lat: number,
  lng: number,
  formattedDate: string
) => {
  for (const response of apiResponses) {
    const astronomicalData = {
      location: location,
      latitude: lat,
      longitude: lng,
      date: formattedDate,
      sunrise: response.data.sunrise,
      sunset: response.data.sunset,
      day_length: response.data.day_length,
      solar_noon: response.data.solar_noon,
      iss_passes: 0,
      iss_next_pass: null,
      people_in_space: 0,
      people_details: null,
      source: response.source,
    };

    const { error } = await supabase
      .from("astronomical_data")
      .insert([astronomicalData]);

    if (error) {
      console.error(`Error saving ${response.source} data:`, error);
    }
  }
};
