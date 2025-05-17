import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/use-toast";
import { useNavigate } from "react-router-dom";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { format, addDays, eachDayOfInterval } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import Header from "@/components/Header";
import { getCoordinates } from "@/services/geocoding";
import { fetchSunriseSunsetData } from "@/services/astronomicalData";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";

const Index = () => {
  const [location, setLocation] = useState("");
  const [date, setDate] = useState<Date>(new Date());
  const [dateFrom, setDateFrom] = useState<Date>(new Date());
  const [dateTo, setDateTo] = useState<Date>(addDays(new Date(), 7));
  const [dateMode, setDateMode] = useState<"single" | "range">("single");
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
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
    setProgress(0);

    try {
      // Get location coordinates using our geocoding service
      const coordinates = getCoordinates(location);

      if (!coordinates) {
        throw new Error("Could not find coordinates for the given location");
      }

      const { lat, lng } = coordinates;

      // Determine which dates to process
      let datesToProcess: Date[];

      if (dateMode === "single") {
        datesToProcess = [date];
      } else {
        // For range mode, get all dates in the interval
        if (dateFrom > dateTo) {
          throw new Error("Start date must be before end date");
        }

        datesToProcess = eachDayOfInterval({
          start: dateFrom,
          end: dateTo,
        });

        // Limit to 30 days maximum to prevent excessive API calls
        if (datesToProcess.length > 30) {
          toast({
            title: "Warning",
            description: "Date range limited to 30 days maximum",
            variant: "destructive",
          });
          datesToProcess = datesToProcess.slice(0, 30);
        }
      }

      // Set up progress tracking
      let completedDates = 0;
      const totalDates = datesToProcess.length;

      // Process each date
      for (const currentDate of datesToProcess) {
        // Format the current date
        const formattedDate = format(currentDate, "yyyy-MM-dd");

        // Fetch astronomical data from APIs
        const apiResponses = await fetchSunriseSunsetData(
          lat,
          lng,
          formattedDate
        );

        if (!apiResponses || apiResponses.length === 0) {
          console.warn(`Failed to fetch data for ${formattedDate}`);
          continue; // Skip to the next date
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
            iss_passes: 0, // Default value since API is not available
            iss_next_pass: null,
            people_in_space: 0, // Default value since API is not available
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

        // Update progress
        completedDates++;
        setProgress(Math.floor((completedDates / totalDates) * 100));
      }

      toast({
        title: "Success",
        description: `Collected astronomical data for ${datesToProcess.length} date(s) successfully!`,
      });

      // Navigate to visualization page
      //navigate("/visualize");
    } catch (error) {
      console.error("Error fetching data:", error);
      toast({
        title: "Error",
        description: `Failed to collect astronomical data: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
      setProgress(0);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md mx-auto">
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl font-bold text-center">
                Astronomical Data Explorer
              </CardTitle>
              <CardDescription className="text-center">
                Search for astronomical data by location and date
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Location
                  </label>
                  <Input
                    placeholder="Enter a city name (e.g., New York)"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                  />
                </div>

                <Tabs
                  defaultValue="single"
                  onValueChange={(v) => setDateMode(v as "single" | "range")}
                >
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="single">Single Date</TabsTrigger>
                    <TabsTrigger value="range">Date Range</TabsTrigger>
                  </TabsList>

                  <TabsContent value="single" className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Date
                      </label>
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
                            {date ? (
                              format(date, "PPP")
                            ) : (
                              <span>Pick a date</span>
                            )}
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
                  </TabsContent>

                  <TabsContent value="range" className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-1">
                          From
                        </label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant={"outline"}
                              className={cn(
                                "w-full justify-start text-left font-normal",
                                !dateFrom && "text-muted-foreground"
                              )}
                            >
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {dateFrom ? (
                                format(dateFrom, "PPP")
                              ) : (
                                <span>Start date</span>
                              )}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={dateFrom}
                              onSelect={(newDate) =>
                                newDate && setDateFrom(newDate)
                              }
                              initialFocus
                              className="p-3 pointer-events-auto"
                            />
                          </PopoverContent>
                        </Popover>
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-1">
                          To
                        </label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant={"outline"}
                              className={cn(
                                "w-full justify-start text-left font-normal",
                                !dateTo && "text-muted-foreground"
                              )}
                            >
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {dateTo ? (
                                format(dateTo, "PPP")
                              ) : (
                                <span>End date</span>
                              )}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={dateTo}
                              onSelect={(newDate) =>
                                newDate && setDateTo(newDate)
                              }
                              initialFocus
                              className="p-3 pointer-events-auto"
                              disabled={(date) => date < dateFrom}
                            />
                          </PopoverContent>
                        </Popover>
                      </div>
                    </div>

                    <div className="text-xs text-muted-foreground">
                      Note: Maximum range is limited to 30 days to prevent
                      excessive API usage.
                    </div>
                  </TabsContent>
                </Tabs>
              </div>

              {isLoading && progress > 0 && (
                <div className="mt-4">
                  <Progress value={progress} className="h-2" />
                  <p className="text-xs text-center mt-1 text-muted-foreground">
                    {progress}% complete
                  </p>
                </div>
              )}
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
                    Explore collected astronomical data with interactive
                    visualizations.
                  </p>
                </CardContent>
                <CardFooter>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => navigate("/visualize")}
                  >
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
                    Discover insights and conclusions from the astronomical
                    data.
                  </p>
                </CardContent>
                <CardFooter>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => navigate("/conclusions")}
                  >
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
