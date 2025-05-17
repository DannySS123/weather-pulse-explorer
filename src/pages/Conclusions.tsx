import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import Header from "@/components/Header";
import { ArrowUpDown, Sun, MapPin, TrendingUp, Calendar } from "lucide-react";
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

interface LatitudeInsight {
  correlation: number;
  description: string;
}

interface SeasonalPattern {
  season: string;
  avgDayLength: number;
  locations: string[];
}

interface LocationTrend {
  location: string;
  trend: "increasing" | "decreasing" | "stable";
  changeRate: number; // minutes per day
}

const Conclusions = () => {
  const [astronomicalData, setAstronomicalData] = useState<
    AstronomicalDataItem[]
  >([]);
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
    const locationScores = Object.entries(locationGroups).map(
      ([location, items]) => {
        const avgDayLength =
          items.reduce((sum, item) => sum + item.day_length, 0) / items.length;

        // Simple scoring method: higher day length = higher score
        const score = avgDayLength / 60; // convert to minutes for easier reading

        return {
          location,
          score: Math.round(score),
          dayLength: Math.round(avgDayLength / 60),
          samples: items.length,
        };
      }
    );

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

      if (sortBy === "location")
        comparison = a.location.localeCompare(b.location);
      else if (sortBy === "dayLength") comparison = a.dayLength - b.dayLength;
      else if (sortBy === "score") comparison = a.score - b.score;
      else if (sortBy === "samples") comparison = a.samples - b.samples;

      // Reverse for descending order
      return sortOrder === "asc" ? comparison : -comparison;
    });
  };

  const conclusionsData = sortedConclusionsData();
  const bestLocation = conclusionsData.length > 0 ? conclusionsData[0] : null;

  // New calculation for latitude correlation with day length
  const latitudeInsight = useMemo((): LatitudeInsight | null => {
    if (astronomicalData.length < 3) return null;

    // Calculate correlation between latitude and day length
    const latitudes = astronomicalData.map((item) => item.latitude);
    const dayLengths = astronomicalData.map((item) => item.day_length / 60);

    // Calculate correlation coefficient
    const n = latitudes.length;
    const sumX = latitudes.reduce((a, b) => a + b, 0);
    const sumY = dayLengths.reduce((a, b) => a + b, 0);
    const sumXY = latitudes.reduce((sum, x, i) => sum + x * dayLengths[i], 0);
    const sumXSquare = latitudes.reduce((sum, x) => sum + x * x, 0);
    const sumYSquare = dayLengths.reduce((sum, y) => sum + y * y, 0);

    const numerator = n * sumXY - sumX * sumY;
    const denominator = Math.sqrt(
      (n * sumXSquare - sumX * sumX) * (n * sumYSquare - sumY * sumY)
    );

    const correlation = denominator === 0 ? 0 : numerator / denominator;

    let description = "";
    if (correlation > 0.7) {
      description =
        "Strong positive correlation: Locations with higher latitudes tend to have longer daylight hours.";
    } else if (correlation > 0.3) {
      description =
        "Moderate positive correlation: Higher latitudes somewhat correlate with longer daylight hours.";
    } else if (correlation > -0.3) {
      description =
        "No significant correlation between latitude and daylight hours in the current dataset.";
    } else if (correlation > -0.7) {
      description =
        "Moderate negative correlation: Higher latitudes somewhat correlate with shorter daylight hours.";
    } else {
      description =
        "Strong negative correlation: Locations with higher latitudes tend to have shorter daylight hours.";
    }

    return {
      correlation: parseFloat(correlation.toFixed(2)),
      description,
    };
  }, [astronomicalData]);

  // Determine seasonal patterns
  const seasonalPatterns = useMemo((): SeasonalPattern[] => {
    if (astronomicalData.length === 0) return [];

    // Group data by month
    const monthGroups: Record<string, AstronomicalDataItem[]> = {};

    astronomicalData.forEach((item) => {
      const date = new Date(item.date);
      const month = date.getMonth();

      let season: string;
      if (month >= 2 && month <= 4) season = "Spring";
      else if (month >= 5 && month <= 7) season = "Summer";
      else if (month >= 8 && month <= 10) season = "Fall";
      else season = "Winter";

      if (!monthGroups[season]) monthGroups[season] = [];
      monthGroups[season].push(item);
    });

    // Calculate average day length for each season
    return Object.entries(monthGroups)
      .map(([season, items]) => {
        const avgDayLength = Math.round(
          items.reduce((sum, item) => sum + item.day_length, 0) /
            items.length /
            60
        );

        // Find top locations for this season
        const locationCounts: Record<string, number> = {};
        const locationTotals: Record<string, number> = {};

        items.forEach((item) => {
          if (!locationCounts[item.location]) {
            locationCounts[item.location] = 0;
            locationTotals[item.location] = 0;
          }
          locationCounts[item.location]++;
          locationTotals[item.location] += item.day_length;
        });

        // Get top 3 locations by average day length
        const locationAvgs = Object.entries(locationTotals).map(
          ([loc, total]) => ({
            location: loc,
            avg: total / locationCounts[loc] / 60,
          })
        );

        locationAvgs.sort((a, b) => b.avg - a.avg);
        const topLocations = locationAvgs
          .slice(0, 3)
          .map((item) => item.location);

        return {
          season,
          avgDayLength,
          locations: topLocations,
        };
      })
      .sort((a, b) => {
        const seasonOrder = { Winter: 0, Spring: 1, Summer: 2, Fall: 3 };
        return (
          seasonOrder[a.season as keyof typeof seasonOrder] -
          seasonOrder[b.season as keyof typeof seasonOrder]
        );
      });
  }, [astronomicalData]);

  // Calculate day length trends for locations with multiple data points
  const locationTrends = useMemo((): LocationTrend[] => {
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

    // Only consider locations with multiple dates
    return Object.entries(locationGroups)
      .filter(([_, items]) => items.length > 1)
      .map(([location, items]) => {
        // Sort by date
        items.sort(
          (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
        );

        // Calculate day-over-day change
        let totalChange = 0;
        for (let i = 1; i < items.length; i++) {
          const prevDayLength = items[i - 1].day_length / 60;
          const currDayLength = items[i].day_length / 60;
          const daysDiff =
            (new Date(items[i].date).getTime() -
              new Date(items[i - 1].date).getTime()) /
            (1000 * 60 * 60 * 24);
          if (daysDiff > 0) {
            totalChange += (currDayLength - prevDayLength) / daysDiff;
          }
        }

        const avgChange = totalChange / (items.length - 1);
        let trend: "increasing" | "decreasing" | "stable" = "stable";

        if (avgChange > 1) trend = "increasing";
        else if (avgChange < -1) trend = "decreasing";

        return {
          location,
          trend,
          changeRate: parseFloat(avgChange.toFixed(1)),
        };
      })
      .sort((a, b) => Math.abs(b.changeRate) - Math.abs(a.changeRate));
  }, [astronomicalData]);

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold">
              Astronomical Data Conclusions
            </h1>
            <Button onClick={() => navigate("/visualize")}>
              Back to Visualizations
            </Button>
          </div>

          {isLoading ? (
            <div className="flex justify-center items-center h-64">
              <p>Loading astronomical data...</p>
            </div>
          ) : astronomicalData.length === 0 ? (
            <div className="flex justify-center items-center h-64">
              <div className="text-center">
                <p className="mb-4">
                  No astronomical data available for analysis.
                </p>
                <Button onClick={() => navigate("/")}>Collect Data</Button>
              </div>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                {latitudeInsight && (
                  <Card className="bg-blue-50 border-blue-200">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <MapPin className="h-5 w-5 text-blue-500" />
                        Latitude Impact
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-col gap-2">
                        <p className="text-lg font-medium">
                          Correlation:{" "}
                          <span
                            className={
                              latitudeInsight.correlation > 0
                                ? "text-green-600"
                                : latitudeInsight.correlation < 0
                                ? "text-red-600"
                                : "text-gray-600"
                            }
                          >
                            {latitudeInsight.correlation}
                          </span>
                        </p>
                        <p>{latitudeInsight.description}</p>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>

              {locationTrends.length > 0 && (
                <Card className="mb-8 bg-green-50 border-green-200">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <TrendingUp className="h-5 w-5 text-green-500" />
                      Day Length Trends
                    </CardTitle>
                    <CardDescription>
                      Changes in daylight duration over time
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {locationTrends.map((item) => (
                        <div
                          key={item.location}
                          className="border-b pb-3 last:border-b-0"
                        >
                          <h3 className="font-bold text-lg">{item.location}</h3>
                          <div className="flex items-center gap-2 mt-1">
                            <span
                              className={
                                item.trend === "increasing"
                                  ? "text-green-600"
                                  : item.trend === "decreasing"
                                  ? "text-red-600"
                                  : "text-yellow-600"
                              }
                            >
                              {item.trend === "increasing"
                                ? "Increasing"
                                : item.trend === "decreasing"
                                ? "Decreasing"
                                : "Stable"}
                            </span>
                            <span className="text-gray-600">
                              {Math.abs(item.changeRate)} min/day
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 mt-1">
                            {item.trend === "increasing"
                              ? `Day length is increasing by ${item.changeRate} minutes each day. Consider visiting later for more daylight.`
                              : item.trend === "decreasing"
                              ? `Day length is decreasing by ${Math.abs(
                                  item.changeRate
                                )} minutes each day. Consider visiting sooner for more daylight.`
                              : "Day length is relatively stable over the observed period."}
                          </p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {seasonalPatterns.length > 0 && (
                <Card className="mb-8 bg-orange-50 border-orange-200">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Calendar className="h-5 w-5 text-orange-500" />
                      Seasonal Patterns
                    </CardTitle>
                    <CardDescription>
                      How day length varies across seasons
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {seasonalPatterns.map((season) => (
                        <div
                          key={season.season}
                          className="border rounded-lg p-4"
                        >
                          <h3 className="font-bold text-lg">{season.season}</h3>
                          <p className="text-lg font-medium mt-1">
                            Avg: {season.avgDayLength} minutes
                          </p>
                          {season.locations.length > 0 && (
                            <div className="mt-2">
                              <p className="text-sm font-medium text-gray-600">
                                Best locations:
                              </p>
                              <ul className="list-disc list-inside text-sm">
                                {season.locations.map((loc) => (
                                  <li key={loc}>{loc}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                    <p className="mt-4 text-sm text-gray-600">
                      {seasonalPatterns.length === 4
                        ? `${seasonalPatterns[2].season} has the longest average day length (${seasonalPatterns[2].avgDayLength} minutes), 
                         while ${seasonalPatterns[0].season} has the shortest (${seasonalPatterns[0].avgDayLength} minutes).`
                        : "Collect data across more dates to see complete seasonal patterns."}
                    </p>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Conclusions;
