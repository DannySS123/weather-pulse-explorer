import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, 
  BarChart, Bar, PieChart, Pie, Cell, ScatterChart, Scatter, ZAxis, TooltipProps
} from "recharts";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import Header from "@/components/Header";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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

interface ProcessedData {
  location: string;
  date: string;
  dayLength: number;
  sunrise: string;
  sunset: string;
  latitude: number;
  longitude: number;
  source: string;
}

interface LocationStat {
  location: string;
  avgDayLength: number;
}

interface SourceData {
  name: string;
  value: number;
}

interface Stats {
  avgDayLength: number;
  maxDayLength: number;
  minDayLength: number;
  locationStats: LocationStat[];
  sourceData: SourceData[];
}

interface ScatterDataPoint {
  x: number;
  y: number;
  z: number;
  name: string;
}

const Visualize = () => {
  const [astronomicalData, setAstronomicalData] = useState<AstronomicalData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [sortBy, setSortBy] = useState<"location" | "date" | "day_length">("date");
  const navigate = useNavigate();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("astronomical_data")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      
      setAstronomicalData(data as AstronomicalData[] || []);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const processedData = useMemo(() => {
    if (!astronomicalData.length) return [];
    
    return astronomicalData.map(item => ({
      location: item.location,
      date: new Date(item.date).toLocaleDateString(),
      dayLength: Math.round(item.day_length / 60), // Convert seconds to minutes
      sunrise: new Date(item.sunrise).toLocaleTimeString(),
      sunset: new Date(item.sunset).toLocaleTimeString(),
      latitude: item.latitude,
      longitude: item.longitude,
      source: item.source
    }));
  }, [astronomicalData]);

  const stats = useMemo(() => {
    if (!astronomicalData.length) return null;
    
    const totalDayLength = astronomicalData.reduce((sum, item) => sum + item.day_length, 0);
    const avgDayLength = Math.round((totalDayLength / astronomicalData.length) / 60); // in minutes
    
    const dayLengths = astronomicalData.map(item => item.day_length / 60); // in minutes
    const maxDayLength = Math.round(Math.max(...dayLengths));
    const minDayLength = Math.round(Math.min(...dayLengths));
    
    const locationGroups = astronomicalData.reduce((groups, item) => {
      const location = item.location;
      if (!groups[location]) {
        groups[location] = [];
      }
      groups[location].push(item);
      return groups;
    }, {} as Record<string, AstronomicalData[]>);
    
    const locationStats = Object.entries(locationGroups).map(([location, items]) => {
      const avgDayLengthForLocation = Math.round(
        items.reduce((sum, item) => sum + item.day_length, 0) / items.length / 60
      );
      return { location, avgDayLength: avgDayLengthForLocation };
    });
    
    const sourceGroups = astronomicalData.reduce((groups, item) => {
      const source = item.source;
      if (!groups[source]) {
        groups[source] = 0;
      }
      groups[source]++;
      return groups;
    }, {} as Record<string, number>);
    
    const sourceData = Object.entries(sourceGroups).map(([name, value]) => ({ name, value }));
    
    return {
      avgDayLength,
      maxDayLength,
      minDayLength,
      locationStats,
      sourceData
    };
  }, [astronomicalData]);

  const sortedData = useMemo(() => {
    if (!processedData.length) return [];
    
    return [...processedData].sort((a, b) => {
      if (sortBy === "location") return a.location.localeCompare(b.location);
      if (sortBy === "date") return new Date(b.date).getTime() - new Date(a.date).getTime();
      if (sortBy === "day_length") return b.dayLength - a.dayLength;
      return 0;
    });
  }, [processedData, sortBy]);

  const scatterData = useMemo(() => {
    if (!astronomicalData.length) return [];
    
    return astronomicalData.map(item => ({
      x: item.latitude, // latitude
      y: item.day_length / 60, // day length in minutes
      z: 1, // size (constant)
      name: item.location
    }));
  }, [astronomicalData]);

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

  const renderCustomTooltipContent = (props: TooltipProps) => {
    const { payload } = props;
    if (!payload || payload.length === 0) return null;
    
    const data = payload[0];
    if (!data || !data.payload) return null;
    
    const name = data.name;
    const value = data.value;
    
    const percent = typeof data.percent === 'number' 
      ? (data.percent * 100).toFixed(0) 
      : '0';
    
    return (
      <div className="bg-white p-2 shadow rounded">
        <p>{`${name}: ${percent}%`}</p>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold">Astronomical Data Visualization</h1>
            <div className="flex items-center gap-4">
              <Select value={sortBy} onValueChange={(value) => setSortBy(value as any)}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="date">Sort by Date</SelectItem>
                  <SelectItem value="location">Sort by Location</SelectItem>
                  <SelectItem value="day_length">Sort by Day Length</SelectItem>
                </SelectContent>
              </Select>
              <Button onClick={() => navigate("/")}>Back to Search</Button>
            </div>
          </div>

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
                    <CardHeader>
                      <CardTitle>Average Day Length</CardTitle>
                    </CardHeader>
                    <CardContent className="text-center">
                      <div className="text-4xl font-bold">{stats.avgDayLength}</div>
                      <div className="text-sm text-muted-foreground">minutes</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader>
                      <CardTitle>Maximum Day Length</CardTitle>
                    </CardHeader>
                    <CardContent className="text-center">
                      <div className="text-4xl font-bold">{stats.maxDayLength}</div>
                      <div className="text-sm text-muted-foreground">minutes</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader>
                      <CardTitle>Minimum Day Length</CardTitle>
                    </CardHeader>
                    <CardContent className="text-center">
                      <div className="text-4xl font-bold">{stats.minDayLength}</div>
                      <div className="text-sm text-muted-foreground">minutes</div>
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
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="dayLength" fill="#8884d8" name="Day Length (minutes)" />
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
                            labelLine={true}
                            label={({ name, percent }) => {
                              const percentValue = typeof percent === 'number' 
                                ? `${(percent * 100).toFixed(0)}%` 
                                : '0%';
                              return `${name}: ${percentValue}`;
                            }}
                            outerRadius={80}
                            fill="#8884d8"
                            dataKey="value"
                          >
                            {stats.sourceData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
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
                      <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                        <CartesianGrid />
                        <XAxis 
                          type="number" 
                          dataKey="x" 
                          name="Latitude" 
                          label={{ value: 'Latitude', position: 'bottom' }}
                        />
                        <YAxis 
                          type="number" 
                          dataKey="y" 
                          name="Day Length" 
                          label={{ value: 'Day Length (min)', angle: -90, position: 'left' }}
                        />
                        <ZAxis type="number" range={[100, 100]} />
                        <Tooltip cursor={{ strokeDasharray: '3 3' }} formatter={(value, name, props) => {
                          if (name === 'Latitude') return [value.toFixed(2), name];
                          if (name === 'Day Length') return [Math.round(value), 'minutes'];
                          return [value, name];
                        }} />
                        <Scatter name="Locations" data={scatterData} fill="#8884d8" />
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
                          <YAxis />
                          <Tooltip />
                          <Legend />
                          <Bar dataKey="avgDayLength" fill="#82ca9d" name="Avg Day Length (min)" />
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
                    <table className="w-full border-collapse">
                      <thead className="bg-gray-100 sticky top-0">
                        <tr>
                          <th className="p-2 text-left">Location</th>
                          <th className="p-2 text-left">Date</th>
                          <th className="p-2 text-left">Sunrise</th>
                          <th className="p-2 text-left">Sunset</th>
                          <th className="p-2 text-left">Day Length (min)</th>
                          <th className="p-2 text-left">Source</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sortedData.map((item, index) => (
                          <tr key={index} className="border-b border-gray-200">
                            <td className="p-2">{item.location}</td>
                            <td className="p-2">{item.date}</td>
                            <td className="p-2">{item.sunrise}</td>
                            <td className="p-2">{item.sunset}</td>
                            <td className="p-2">{item.dayLength}</td>
                            <td className="p-2">{item.source}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
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
