
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import Header from "@/components/Header";
import { ArrowUpDown } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface AstronomicalDataItem {
  id: string;
  location: string;
  latitude: number;
  longitude: number;
  date: string;
  sunrise: string;
  sunset: string;
  day_length: number;
  solar_noon: string;
  source: string;
  created_at: string;
}

interface LocationScore {
  location: string;
  score: number;
  dayLength: number;
  samples: number;
}

type SortableColumn = "rank" | "location" | "dayLength" | "score" | "samples";

const Conclusions = () => {
  const [astronomicalData, setAstronomicalData] = useState<AstronomicalDataItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [sortBy, setSortBy] = useState<SortableColumn>("score");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const navigate = useNavigate();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("astronomical_data")
        .select("*");

      if (error) throw error;
      
      setAstronomicalData(data || []);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Process the data to derive conclusions
  const conclusions = (): LocationScore[] => {
    if (astronomicalData.length === 0) return [];

    // Group data by location
    const locationGroups = astronomicalData.reduce((groups, item) => {
      const location = item.location;
      if (!groups[location]) {
        groups[location] = [];
      }
      groups[location].push(item);
      return groups;
    }, {} as Record<string, AstronomicalDataItem[]>);

    // Calculate average day length for each location
    const locationScores = Object.entries(locationGroups).map(([location, items]) => {
      const avgDayLength = items.reduce((sum, item) => sum + item.day_length, 0) / items.length;
      
      // Simple scoring method: higher day length = higher score
      const score = avgDayLength / 60; // convert to minutes for easier reading
      
      return {
        location,
        score: Math.round(score),
        dayLength: Math.round(avgDayLength / 60),
        samples: items.length
      };
    });

    return locationScores;
  };

  // Handle sorting
  const handleSort = (column: SortableColumn) => {
    if (sortBy === column) {
      // Toggle sort order if clicking the same column
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      // Set new column and default to descending for most metrics
      setSortBy(column);
      setSortOrder(column === "location" ? "asc" : "desc");
    }
  };

  // Apply sorting
  const sortedConclusionsData = (): LocationScore[] => {
    const data = conclusions();
    
    if (data.length === 0) return [];
    
    return [...data].sort((a, b) => {
      let comparison = 0;
      
      if (sortBy === "location") comparison = a.location.localeCompare(b.location);
      else if (sortBy === "dayLength") comparison = a.dayLength - b.dayLength;
      else if (sortBy === "score") comparison = a.score - b.score;
      else if (sortBy === "samples") comparison = a.samples - b.samples;
      
      // Reverse for descending order
      return sortOrder === "asc" ? comparison : -comparison;
    });
  };

  const conclusionsData = sortedConclusionsData();
  const bestLocation = conclusionsData.length > 0 ? conclusionsData[0] : null;

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold">Astronomical Data Conclusions</h1>
            <Button onClick={() => navigate("/visualize")}>Back to Visualizations</Button>
          </div>

          {isLoading ? (
            <div className="flex justify-center items-center h-64">
              <p>Loading astronomical data...</p>
            </div>
          ) : astronomicalData.length === 0 ? (
            <div className="flex justify-center items-center h-64">
              <div className="text-center">
                <p className="mb-4">No astronomical data available for analysis.</p>
                <Button onClick={() => navigate("/")}>Collect Data</Button>
              </div>
            </div>
          ) : (
            <>
              {bestLocation && (
                <Card className="mb-8 bg-primary/5 border-primary/20">
                  <CardHeader>
                    <CardTitle className="text-center">Best Location for Daylight</CardTitle>
                  </CardHeader>
                  <CardContent className="text-center">
                    <h2 className="text-3xl font-bold mb-2">{bestLocation.location}</h2>
                    <p className="text-lg">
                      Average day length: <span className="font-semibold">{bestLocation.dayLength} minutes</span>
                    </p>
                    <p className="text-sm text-muted-foreground mt-2">
                      Based on {bestLocation.samples} data samples
                    </p>
                  </CardContent>
                </Card>
              )}

              <Card>
                <CardHeader>
                  <CardTitle>Location Rankings by Daylight</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead onClick={() => handleSort("rank")} className="cursor-pointer w-16">
                          <div className="flex items-center">
                            Rank
                            <ArrowUpDown className="ml-1 h-4 w-4" />
                          </div>
                        </TableHead>
                        <TableHead onClick={() => handleSort("location")} className="cursor-pointer">
                          <div className="flex items-center">
                            Location
                            <ArrowUpDown className="ml-1 h-4 w-4" />
                          </div>
                        </TableHead>
                        <TableHead onClick={() => handleSort("dayLength")} className="cursor-pointer">
                          <div className="flex items-center">
                            Average Day Length
                            <ArrowUpDown className="ml-1 h-4 w-4" />
                          </div>
                        </TableHead>
                        <TableHead onClick={() => handleSort("score")} className="cursor-pointer">
                          <div className="flex items-center">
                            Score
                            <ArrowUpDown className="ml-1 h-4 w-4" />
                          </div>
                        </TableHead>
                        <TableHead onClick={() => handleSort("samples")} className="cursor-pointer">
                          <div className="flex items-center">
                            Samples
                            <ArrowUpDown className="ml-1 h-4 w-4" />
                          </div>
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {conclusionsData.map((item, index) => (
                        <TableRow key={item.location} className={index === 0 ? 'bg-primary/5' : ''}>
                          <TableCell className="font-medium">{index + 1}</TableCell>
                          <TableCell>{item.location}</TableCell>
                          <TableCell>{item.dayLength} minutes</TableCell>
                          <TableCell>{item.score}</TableCell>
                          <TableCell>{item.samples}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Conclusions;
