
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from "recharts";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

const Visualize = () => {
  const [astronomicalData, setAstronomicalData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
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
      
      setAstronomicalData(data || []);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Process data for visualization
  const dayLengthData = astronomicalData.map(item => ({
    location: item.location,
    dayLength: Math.round(item.day_length / 60), // Convert seconds to minutes
    peopleInSpace: item.people_in_space
  }));

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Astronomical Data Visualization</h1>
          <Button onClick={() => navigate("/")}>Back to Search</Button>
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <Card>
                <CardHeader>
                  <CardTitle>Day Length by Location (minutes)</CardTitle>
                </CardHeader>
                <CardContent className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={dayLengthData}>
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
                  <CardTitle>People in Space by Query Date</CardTitle>
                </CardHeader>
                <CardContent className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={astronomicalData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Line type="monotone" dataKey="people_in_space" stroke="#82ca9d" name="People in Space" />
                    </LineChart>
                  </ResponsiveContainer>
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
                        <th className="p-2 text-left">ISS Passes</th>
                        <th className="p-2 text-left">People in Space</th>
                      </tr>
                    </thead>
                    <tbody>
                      {astronomicalData.map((item) => (
                        <tr key={item.id} className="border-b border-gray-200">
                          <td className="p-2">{item.location}</td>
                          <td className="p-2">{new Date(item.date).toLocaleDateString()}</td>
                          <td className="p-2">{new Date(item.sunrise).toLocaleTimeString()}</td>
                          <td className="p-2">{new Date(item.sunset).toLocaleTimeString()}</td>
                          <td className="p-2">{Math.round(item.day_length / 60)}</td>
                          <td className="p-2">{item.iss_passes || "N/A"}</td>
                          <td className="p-2">{item.people_in_space}</td>
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
  );
};

export default Visualize;
