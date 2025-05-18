import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  ScatterChart,
  Scatter,
  ZAxis,
  TooltipProps as RechartTooltipProps,
} from "recharts";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import Header from "@/components/Header";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { format, isBefore, isAfter, parseISO } from "date-fns";
import { cn } from "@/lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Sun, Moon, ArrowUpDown, FilterX } from "lucide-react";
import { getAstronomicalData } from "@/services/getAstronomicalData";

interface AstronomicalData {
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

interface FilteredData {
  location: string;
  date: string;
  dayLength: number;
  sunrise: string;
  sunset: string;
  latitude: number;
  longitude: number;
  source: string;
}

interface SourceData {
  name: string;
  value: number;
}

type SortableColumn =
  | "location"
  | "date"
  | "day_length"
  | "sunrise"
  | "sunset"
  | "source";

const Visualize = () => {
  const [astronomicalData, setAstronomicalData] = useState<AstronomicalData[]>(
    []
  );
  const [isLoading, setIsLoading] = useState(true);
  const [sortBy, setSortBy] = useState<SortableColumn>("date");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [cityFilter, setCityFilter] = useState<string>("");
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  const navigate = useNavigate();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await getAstronomicalData();
      if (error) throw error;

      setAstronomicalData((data as AstronomicalData[]) || []);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSort = (column: SortableColumn) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(column);
      setSortOrder("asc");
    }
  };

  const handleClearFilters = () => {
    setCityFilter("");
    setStartDate(undefined);
    setEndDate(undefined);
  };

  const isSameDay = (date1: Date, date2: Date) => {
    return (
      date1.getFullYear() === date2.getFullYear() &&
      date1.getMonth() === date2.getMonth() &&
      date1.getDate() === date2.getDate()
    );
  };

  function applyFilters<T extends { location: string; date: string }>(
    data: T[]
  ): T[] {
    let filteredData = data;
    if (cityFilter) {
      filteredData = filteredData.filter((item) =>
        item.location.toLowerCase().includes(cityFilter.toLowerCase())
      );
    }

    if (startDate || endDate) {
      filteredData = filteredData.filter((item) => {
        const itemDate = new Date(item.date);

        if (
          startDate &&
          !isAfter(itemDate, startDate) &&
          !isSameDay(itemDate, startDate)
        ) {
          return false;
        }

        // Check if date is before end date (if set)
        if (
          endDate &&
          !isBefore(itemDate, endDate) &&
          !isSameDay(itemDate, endDate)
        ) {
          return false;
        }

        return true;
      });
    }
    return filteredData;
  }

  const processedData = useMemo(() => {
    if (!astronomicalData.length) return [];

    return astronomicalData.map((item) => ({
      location: item.location,
      date: new Date(item.date).toLocaleDateString(),
      dayLength: Math.round(item.day_length / 60), // Convert seconds to minutes
      sunrise: new Date(item.sunrise).toLocaleTimeString(),
      sunset: new Date(item.sunset).toLocaleTimeString(),
      latitude: item.latitude,
      longitude: item.longitude,
      source: item.source,
    }));
  }, [astronomicalData]);

  const sortedData = useMemo(() => {
    if (!processedData.length) return [];

    const filteredData = applyFilters(processedData);

    return [...filteredData].sort((a, b) => {
      let comparison = 0;

      if (sortBy === "location")
        comparison = a.location.localeCompare(b.location);
      else if (sortBy === "date")
        comparison = new Date(a.date).getTime() - new Date(b.date).getTime();
      else if (sortBy === "day_length") comparison = a.dayLength - b.dayLength;
      else if (sortBy === "sunrise")
        comparison = a.sunrise.localeCompare(b.sunrise);
      else if (sortBy === "sunset")
        comparison = a.sunset.localeCompare(b.sunset);
      else if (sortBy === "source")
        comparison = a.source.localeCompare(b.source);

      return sortOrder === "asc" ? comparison : -comparison;
    });
  }, [processedData, sortBy, sortOrder, cityFilter, startDate, endDate]);

  const stats = useMemo(() => {
    if (!astronomicalData.length) return null;

    const filteredData = applyFilters(astronomicalData);

    if (filteredData.length === 0) return null;

    const totalDayLength = filteredData.reduce(
      (sum, item) => sum + item.day_length,
      0
    );
    const avgDayLength = Math.round(totalDayLength / filteredData.length / 60); // in minutes

    const dayLengths = filteredData.map((item) => item.day_length / 60); // in minutes
    const maxDayLength = Math.round(Math.max(...dayLengths));
    const minDayLength = Math.round(Math.min(...dayLengths));

    const locationGroups = filteredData.reduce((groups, item) => {
      const location = item.location;
      if (!groups[location]) {
        groups[location] = [];
      }
      groups[location].push(item);
      return groups;
    }, {} as Record<string, AstronomicalData[]>);

    const locationStats = Object.entries(locationGroups).map(
      ([location, items]) => {
        const avgDayLengthForLocation = Math.round(
          items.reduce((sum, item) => sum + item.day_length, 0) /
            items.length /
            60
        );
        return { location, avgDayLength: avgDayLengthForLocation };
      }
    );

    const sourceGroups = filteredData.reduce((groups, item) => {
      const source = item.source;
      if (!groups[source]) {
        groups[source] = 0;
      }
      groups[source]++;
      return groups;
    }, {} as Record<string, number>);

    const sourceData = Object.entries(sourceGroups).map(([name, value]) => ({
      name,
      value,
    }));

    return {
      avgDayLength,
      maxDayLength,
      minDayLength,
      locationStats,
      sourceData,
    };
  }, [astronomicalData, cityFilter, startDate, endDate]);

  const scatterData = useMemo(() => {
    if (!astronomicalData.length) return [];

    const filteredData = applyFilters(astronomicalData);

    return filteredData.map((item) => ({
      x: item.latitude,
      y: item.day_length / 60,
      z: 1,
      name: item.location,
    }));
  }, [astronomicalData, cityFilter, startDate, endDate]);

  const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884D8"];

  const renderCustomTooltipContent = (
    props: RechartTooltipProps<number, string>
  ) => {
    const { payload } = props;
    if (!payload || payload.length === 0) return null;

    const data = payload[0];
    if (!data || !data.payload) return null;

    const name = data.payload.name;
    const value = data.payload.value;
    const total =
      stats?.sourceData.reduce((sum, item) => sum + item.value, 0) || 1;
    const percent = ((value / total) * 100).toFixed(0) + "%";

    return (
      <div className="bg-white p-2 shadow rounded">
        <p>{`${name}: ${percent}`}</p>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold">
              Astronomical Data Visualization
            </h1>
            <div className="flex items-center gap-4">
              <Button onClick={() => navigate("/conclusions")}>
                View Conclusions
              </Button>
              <Button onClick={() => navigate("/")}>Back to Search</Button>
            </div>
          </div>

          {!isLoading && astronomicalData.length > 0 && (
            <div className="mb-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Filter by Location
                  </label>
                  <Input
                    type="text"
                    placeholder="Enter city name..."
                    value={cityFilter}
                    onChange={(e) => setCityFilter(e.target.value)}
                    className="w-full"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Start Date
                    </label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant={"outline"}
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !startDate && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {startDate ? (
                            format(startDate, "PPP")
                          ) : (
                            <span>Pick a date</span>
                          )}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={startDate}
                          onSelect={setStartDate}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">
                      End Date
                    </label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant={"outline"}
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !endDate && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {endDate ? (
                            format(endDate, "PPP")
                          ) : (
                            <span>Pick a date</span>
                          )}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={endDate}
                          onSelect={setEndDate}
                          disabled={
                            startDate
                              ? (date) => isBefore(date, startDate)
                              : undefined
                          }
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button
                    variant="outline"
                    onClick={handleClearFilters}
                    className="flex items-center gap-1"
                    disabled={!cityFilter && !startDate && !endDate}
                  >
                    <FilterX className="h-4 w-4" />
                    Clear Filters
                  </Button>
                </div>
              </div>

              {/* Add filter summary */}
              {(cityFilter || startDate || endDate) && (
                <div className="mt-2 text-sm text-muted-foreground">
                  Filtering:
                  {cityFilter && (
                    <span className="font-medium">
                      {" "}
                      Location contains "{cityFilter}"
                    </span>
                  )}
                  {cityFilter && (startDate || endDate) && <span> and</span>}
                  {startDate && (
                    <span className="font-medium">
                      {" "}
                      From {format(startDate, "PPP")}
                    </span>
                  )}
                  {startDate && endDate && <span> to</span>}
                  {endDate && (
                    <span className="font-medium">
                      {" "}
                      {format(endDate, "PPP")}
                    </span>
                  )}
                  {" — "}
                  <span className="font-medium">
                    {sortedData.length} results
                  </span>
                </div>
              )}
            </div>
          )}

          {isLoading ? (
            <div className="flex justify-center items-center h-64">
              <p>Loading astronomical data...</p>
            </div>
          ) : astronomicalData.length === 0 ? (
            <div className="flex justify-center items-center h-64">
              <div className="text-center">
                <p className="mb-4">No astronomical data available yet.</p>
                <Button onClick={() => navigate("/")}>Collect Data</Button>
              </div>
            </div>
          ) : (
            <>
              {stats && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="flex items-center gap-2">
                        <Sun className="h-5 w-5 text-yellow-500" />
                        Average Day Length
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="text-center">
                      <div className="text-4xl font-bold">
                        {stats.avgDayLength}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        minutes
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="flex items-center gap-2">
                        <Sun className="h-5 w-5 text-orange-500" />
                        Maximum Day Length
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="text-center">
                      <div className="text-4xl font-bold">
                        {stats.maxDayLength}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        minutes
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="flex items-center gap-2">
                        <Moon className="h-5 w-5 text-blue-500" />
                        Minimum Day Length
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="text-center">
                      <div className="text-4xl font-bold">
                        {stats.minDayLength}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        minutes
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <Card>
                  <CardHeader>
                    <CardTitle>Day Length by Location (minutes)</CardTitle>
                  </CardHeader>
                  <CardContent className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={sortedData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="location" />
                        <YAxis
                          label={{
                            value: "Minutes",
                            angle: -90,
                            position: "insideLeft",
                          }}
                        />
                        <Tooltip
                          formatter={(value) => [
                            `${value} minutes`,
                            "Day Length",
                          ]}
                        />
                        <Legend />
                        <Bar
                          dataKey="dayLength"
                          fill="#8884d8"
                          name="Day Length"
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Data Sources Distribution</CardTitle>
                  </CardHeader>
                  <CardContent className="h-80">
                    {stats && (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={stats.sourceData}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={({ name, percent }) => {
                              const percentValue =
                                typeof percent === "number"
                                  ? `${(percent * 100).toFixed(0)}%`
                                  : "0%";
                              return `${name}: ${percentValue}`;
                            }}
                            outerRadius={80}
                            fill="#8884d8"
                            dataKey="value"
                          >
                            {stats.sourceData.map((entry, index) => (
                              <Cell
                                key={`cell-${index}`}
                                fill={COLORS[index % COLORS.length]}
                              />
                            ))}
                          </Pie>
                          <Tooltip content={renderCustomTooltipContent} />
                        </PieChart>
                      </ResponsiveContainer>
                    )}
                  </CardContent>
                </Card>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <Card>
                  <CardHeader>
                    <CardTitle>Latitude vs. Day Length</CardTitle>
                  </CardHeader>
                  <CardContent className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <ScatterChart
                        margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
                      >
                        <CartesianGrid />
                        <XAxis
                          type="number"
                          dataKey="x"
                          name="Latitude"
                          label={{ value: "Latitude (°N)", position: "bottom" }}
                        />
                        <YAxis
                          type="number"
                          dataKey="y"
                          name="Day Length"
                          label={{
                            value: "Day Length (min)",
                            angle: -90,
                            position: "left",
                          }}
                        />
                        <ZAxis type="number" range={[100, 100]} />
                        <Tooltip
                          cursor={{ strokeDasharray: "3 3" }}
                          formatter={(value, name) => {
                            if (typeof value === "number") {
                              if (name === "Latitude")
                                return [value.toFixed(2), "Latitude (°N)"];
                              if (name === "Day Length")
                                return [Math.round(value), "Minutes"];
                            }
                            return [value, name];
                          }}
                        />
                        <Scatter
                          name="Locations"
                          data={scatterData}
                          fill="#8884d8"
                        />
                      </ScatterChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Average Day Length by Location</CardTitle>
                  </CardHeader>
                  <CardContent className="h-80">
                    {stats && (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={stats.locationStats}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="location" />
                          <YAxis
                            label={{
                              value: "Minutes",
                              angle: -90,
                              position: "insideLeft",
                            }}
                          />
                          <Tooltip
                            formatter={(value) => [
                              `${value} minutes`,
                              "Average Day Length",
                            ]}
                          />
                          <Legend />
                          <Bar
                            dataKey="avgDayLength"
                            fill="#82ca9d"
                            name="Avg Day Length"
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    )}
                  </CardContent>
                </Card>
              </div>

              <Card className="mb-8">
                <CardHeader>
                  <CardTitle>Collected Astronomical Data</CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-96">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead
                            onClick={() => handleSort("location")}
                            className="cursor-pointer"
                          >
                            <div className="flex items-center">
                              Location
                              <ArrowUpDown className="ml-1 h-4 w-4" />
                            </div>
                          </TableHead>
                          <TableHead
                            onClick={() => handleSort("date")}
                            className="cursor-pointer"
                          >
                            <div className="flex items-center">
                              Date
                              <ArrowUpDown className="ml-1 h-4 w-4" />
                            </div>
                          </TableHead>
                          <TableHead
                            onClick={() => handleSort("sunrise")}
                            className="cursor-pointer"
                          >
                            <div className="flex items-center">
                              Sunrise
                              <ArrowUpDown className="ml-1 h-4 w-4" />
                            </div>
                          </TableHead>
                          <TableHead
                            onClick={() => handleSort("sunset")}
                            className="cursor-pointer"
                          >
                            <div className="flex items-center">
                              Sunset
                              <ArrowUpDown className="ml-1 h-4 w-4" />
                            </div>
                          </TableHead>
                          <TableHead
                            onClick={() => handleSort("day_length")}
                            className="cursor-pointer"
                          >
                            <div className="flex items-center">
                              Day Length (min)
                              <ArrowUpDown className="ml-1 h-4 w-4" />
                            </div>
                          </TableHead>
                          <TableHead
                            onClick={() => handleSort("source")}
                            className="cursor-pointer"
                          >
                            <div className="flex items-center">
                              Source
                              <ArrowUpDown className="ml-1 h-4 w-4" />
                            </div>
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {sortedData.map((item, index) => (
                          <TableRow key={index}>
                            <TableCell>{item.location}</TableCell>
                            <TableCell>{item.date}</TableCell>
                            <TableCell>{item.sunrise}</TableCell>
                            <TableCell>{item.sunset}</TableCell>
                            <TableCell>{item.dayLength}</TableCell>
                            <TableCell>{item.source}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Visualize;
