
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/use-toast";
import { useNavigate } from "react-router-dom";

const Index = () => {
  const [location, setLocation] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const fetchAstronomicalData = async () => {
    if (!location.trim()) {
      toast({
        title: "Error",
        description: "Please enter a location",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      // Get location coordinates (simplified for now)
      // In a real app, we would use a geocoding API
      const latitude = 40.7128; // Example: NYC
      const longitude = -74.006;
      
      // Fetch sunrise/sunset data from primary API
      const sunriseResponse = await fetch(
        `https://api.sunrise-sunset.org/json?lat=${latitude}&lng=${longitude}&formatted=0`
      );
      const sunriseData = await sunriseResponse.json();
      
      if (sunriseData.status !== "OK") {
        throw new Error("Failed to fetch sunrise/sunset data");
      }
      
      // Format the date
      const today = new Date().toISOString().split('T')[0];
      
      // Calculate day length in seconds
      const sunrise = new Date(sunriseData.results.sunrise);
      const sunset = new Date(sunriseData.results.sunset);
      const dayLengthSeconds = Math.floor((sunset.getTime() - sunrise.getTime()) / 1000);
      
      // Prepare data for database
      const astronomicalData = {
        location: location,
        latitude: latitude,
        longitude: longitude,
        date: today,
        sunrise: sunriseData.results.sunrise,
        sunset: sunriseData.results.sunset,
        day_length: dayLengthSeconds,
        solar_noon: sunriseData.results.solar_noon,
        iss_passes: 0,  // Default value since API is not available
        iss_next_pass: null,
        people_in_space: 0,  // Default value since API is not available
        people_details: null,
        source: "sunrise-sunset.org"
      };
      
      // Store in Supabase
      const { error } = await supabase
        .from('astronomical_data')
        .insert([astronomicalData]);
        
      if (error) throw error;
      
      toast({
        title: "Success",
        description: "Astronomical data collected successfully!",
      });
      
      // Navigate to visualization page
      navigate("/visualize");
      
    } catch (error) {
      console.error("Error fetching data:", error);
      toast({
        title: "Error",
        description: "Failed to collect astronomical data. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md mx-auto">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-center">Astronomical Data Explorer</CardTitle>
            <CardDescription className="text-center">
              Search for astronomical data by location
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <Input
                  placeholder="Enter a city name (e.g., New York)"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                />
              </div>
            </div>
          </CardContent>
          <CardFooter>
            <Button 
              className="w-full" 
              onClick={fetchAstronomicalData}
              disabled={isLoading}
            >
              {isLoading ? "Collecting Data..." : "Collect Astronomical Data"}
            </Button>
          </CardFooter>
        </Card>
        
        <div className="mt-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Visualize Data</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-500">
                  Explore collected astronomical data with interactive visualizations.
                </p>
              </CardContent>
              <CardFooter>
                <Button variant="outline" className="w-full" onClick={() => navigate("/visualize")}>
                  View Visualizations
                </Button>
              </CardFooter>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Conclusions</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-500">
                  Discover insights and conclusions from the astronomical data.
                </p>
              </CardContent>
              <CardFooter>
                <Button variant="outline" className="w-full" onClick={() => navigate("/conclusions")}>
                  View Conclusions
                </Button>
              </CardFooter>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
