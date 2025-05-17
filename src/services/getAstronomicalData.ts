import { supabase } from "@/integrations/supabase/client";

export const getAstronomicalData = async () => {
  const { data, error } = await supabase
    .from("astronomical_data")
    .select("*")
    .order("created_at", { ascending: false });

  return { data, error };
};
