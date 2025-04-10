
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";

const Conclusions = () => {
  const [astronomicalData, setAstronomicalData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [scoringMethod, setScoringMethod] = useState("dayLength");
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

  // Calculate astronomical scores
  const calculateScores = () => {
    if (!astronomicalData.length) return [];

    return astronomicalData.map(item => {
      // Calculate normalized score (0-100) based on the selected method
      let score = 0;
      if (scoringMethod === "dayLength") {
        // Longer day length is better (max approx 43200 seconds or 12 hours)
        score = (item.day_length / 43200) * 100;
      } else if (scoringMethod === "issPasses") {
        // More ISS passes is better (typical range 0-5)
        score = item.iss_passes ? (item.iss_passes / 5) * 100 : 0;
      } else if (scoringMethod === "combined") {
        // Combined score
        const dayLengthScore = (item.day_length / 43200) * 100;
        const issPassesScore = item.iss_passes ? (item.iss_passes / 5) * 100 : 0;
        score = (dayLengthScore * 0.7) + (issPassesScore * 0.3); // 70% day length, 30% ISS passes
      }

      return {
        location: item.location,
        date: new Date(item.date).toLocaleDateString(),
        score: Math.min(Math.round(score), 100), // Cap at 100
        dayLength: Math.round(item.day_length / 60), // in minutes
        issPasses: item.iss_passes || 0,
        peopleInSpace: item.people_in_space,
      };
    }).sort((a, b) => b.score - a.score); // Sort by score descending
  };

  const scores = calculateScores();
  const bestLocation = scores.length > 0 ? scores[0] : null;

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Astronomical Conclusions</h1>
          <Button onClick={() => navigate("/")}>Back to Search</Button>
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
            <Card className="mb-8">
              <CardHeader>
                <CardTitle>Scoring Method</CardTitle>
              </CardHeader>
              <CardContent>
                <RadioGroup 
                  value={scoringMethod} 
                  onValueChange={setScoringMethod}
                  className="flex flex-col space-y-2"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="dayLength" id="dayLength" />
                    <Label htmlFor="dayLength">Day Length (longer days score higher)</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="issPasses" id="issPasses" />
                    <Label htmlFor="issPasses">ISS Passes (more passes score higher)</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="combined" id="combined" />
                    <Label htmlFor="combined">Combined Score (70% day length, 30% ISS passes)</Label>
                  </div>
                </RadioGroup>
              </CardContent>
            </Card>

            {bestLocation && (
              <Card className="mb-8 bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-indigo-100">
                <CardHeader>
                  <CardTitle className="text-xl text-center">Best Location for Astronomical Observation</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center mb-4">
                    <h3 className="text-2xl font-bold text-indigo-700">{bestLocation.location}</h3>
                    <p className="text-gray-600">Date: {bestLocation.date}</p>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between mb-1">
                        <span className="font-medium">Overall Score</span>
                        <span className="font-medium">{bestLocation.score}%</span>
                      </div>
                      <Progress value={bestLocation.score} className="h-2" />
                    </div>
                    <div className="grid grid-cols-2 gap-4 mt-4">
                      <div className="bg-white p-4 rounded-lg shadow-sm">
                        <p className="text-gray-500 text-sm">Day Length</p>
                        <p className="text-lg font-semibold">{bestLocation.dayLength} minutes</p>
                      </div>
                      <div className="bg-white p-4 rounded-lg shadow-sm">
                        <p className="text-gray-500 text-sm">ISS Passes</p>
                        <p className="text-lg font-semibold">{bestLocation.issPasses}</p>
                      </div>
                      <div className="bg-white p-4 rounded-lg shadow-sm">
                        <p className="text-gray-500 text-sm">People in Space</p>
                        <p className="text-lg font-semibold">{bestLocation.peopleInSpace}</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <CardTitle>Location Rankings</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {scores.map((item, index) => (
                    <div key={index} className="border rounded-lg p-4">
                      <div className="flex justify-between items-center mb-2">
                        <div>
                          <h3 className="font-medium">{index + 1}. {item.location}</h3>
                          <p className="text-sm text-gray-500">{item.date}</p>
                        </div>
                        <span className="font-bold">{item.score}%</span>
                      </div>
                      <Progress value={item.score} className="h-2 mb-2" />
                      <div className="grid grid-cols-3 gap-2 text-sm mt-2">
                        <div className="text-gray-600">
                          Day Length: {item.dayLength} min
                        </div>
                        <div className="text-gray-600">
                          ISS Passes: {item.issPasses}
                        </div>
                        <div className="text-gray-600">
                          People in Space: {item.peopleInSpace}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
};

export default Conclusions;
