
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/use-toast";
import { useNavigate } from "react-router-dom";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import Header from "@/components/Header";
import { getCoordinates } from "@/services/geocoding";
import { fetchSunriseSunsetData } from "@/services/astronomicalData";

const Index = () => {
  const [location, setLocation] = useState("");
  const [date, setDate] = useState<Date>(new Date());
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
      // Get location coordinates using our geocoding service
      const coordinates = getCoordinates(location);
      
      if (!coordinates) {
        throw new Error("Could not find coordinates for the given location");
      }
      
      const { lat, lng } = coordinates;
      
      // Format the selected date
      const formattedDate = format(date, "yyyy-MM-dd");
      
      // Fetch astronomical data from APIs
      const apiResponses = await fetchSunriseSunsetData(lat, lng, formattedDate);
      
      if (!apiResponses || apiResponses.length === 0) {
        throw new Error("Failed to fetch astronomical data");
      }
      
      // Store each API result separately in the database
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
          iss_passes: 0,  // Default value since API is not available
          iss_next_pass: null,
          people_in_space: 0,  // Default value since API is not available
          people_details: null,
          source: response.source
        };
        
        const { error } = await supabase
          .from('astronomical_data')
          .insert([astronomicalData]);
          
        if (error) {
          console.error(`Error saving ${response.source} data:`, error);
        }
      }
      
      toast({
        title: "Success",
        description: `Collected astronomical data from ${apiResponses.length} source(s) successfully!`,
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
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md mx-auto">
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl font-bold text-center">Astronomical Data Explorer</CardTitle>
              <CardDescription className="text-center">
                Search for astronomical data by location and date
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Location</label>
                  <Input
                    placeholder="Enter a city name (e.g., New York)"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Date</label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant={"outline"}
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !date && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {date ? format(date, "PPP") : <span>Pick a date</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={date}
                        onSelect={(newDate) => newDate && setDate(newDate)}
                        initialFocus
                        className="p-3 pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
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
    </div>
  );
};

export default Index;
