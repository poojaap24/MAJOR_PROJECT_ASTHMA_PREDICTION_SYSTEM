import skySafe from "@/assets/sky-safe.jpg";
import skyModerate from "@/assets/sky-moderate.jpg";
import skyHigh from "@/assets/sky-high.jpg";
import skySevere from "@/assets/sky-severe.jpg";

export type RiskTier = "safe" | "moderate" | "high" | "severe";

export const RISK_META: Record<
  RiskTier,
  { label: string; image: string; badge: string; dot: string; text: string; ring: string }
> = {
  safe: {
    label: "Safe",
    image: skySafe,
    badge: "bg-safe-soft text-safe",
    dot: "bg-safe",
    text: "text-safe",
    ring: "ring-safe/30",
  },
  moderate: {
    label: "Moderate",
    image: skyModerate,
    badge: "bg-moderate-soft text-[oklch(0.55_0.13_80)]",
    dot: "bg-moderate",
    text: "text-[oklch(0.55_0.13_80)]",
    ring: "ring-moderate/30",
  },
  high: {
    label: "High",
    image: skyHigh,
    badge: "bg-high-soft text-high",
    dot: "bg-high",
    text: "text-high",
    ring: "ring-high/30",
  },
  severe: {
    label: "Severe",
    image: skySevere,
    badge: "bg-severe-soft text-severe",
    dot: "bg-severe",
    text: "text-severe",
    ring: "ring-severe/30",
  },
};

export const RISK_HEX: Record<RiskTier, string> = {
  safe: "#16a34a",
  moderate: "#eab308",
  high: "#f97316",
  severe: "#dc2626",
};

export function tierFromAqi(aqi: number): RiskTier {
  if (aqi <= 50) return "safe";
  if (aqi <= 100) return "moderate";
  if (aqi <= 150) return "high";
  return "severe";
}

export const currentConditions = {
  location: "Coimbatore, Tamil Nadu",
  aqi: 96,
  riskScore: 58,
  updated: "2 min ago",
  temperature: 31,
  humidity: 64,
  wind: 12,
  uv: 7,
  predictedPm25: 42.6,
  pollutants: [
    { key: "PM2.5", value: 38.4, unit: "µg/m³", limit: 60 },
    { key: "PM10", value: 74.1, unit: "µg/m³", limit: 100 },
    { key: "NO₂", value: 26.8, unit: "µg/m³", limit: 80 },
    { key: "SO₂", value: 11.2, unit: "µg/m³", limit: 80 },
    { key: "CO", value: 0.84, unit: "mg/m³", limit: 4 },
    { key: "O₃", value: 48.5, unit: "µg/m³", limit: 100 },
  ],
  recommendations: [
    "Limit outdoor exertion between 4pm and 8pm when PM2.5 peaks.",
    "Carry your reliever inhaler — moderate air can trigger tightness.",
    "Keep windows shut during the evening traffic hour.",
    "A well-fitted N95 helps on the commute.",
  ],
};

export const recentLocations = [
  { city: "Coimbatore", region: "Tamil Nadu", aqi: 96, tier: "moderate" as RiskTier },
  { city: "Bengaluru", region: "Karnataka", aqi: 44, tier: "safe" as RiskTier },
  { city: "Delhi", region: "NCR", aqi: 214, tier: "severe" as RiskTier },
  { city: "Chennai", region: "Tamil Nadu", aqi: 128, tier: "high" as RiskTier },
];

export const historyRows = [
  { id: "PR-1041", date: "2026-09-06 08:12", location: "Coimbatore, TN", tier: "moderate" as RiskTier, score: 58, pm25: 38.4, aqi: 96 },
  { id: "PR-1040", date: "2026-09-05 19:44", location: "Chennai, TN", tier: "high" as RiskTier, score: 71, pm25: 61.2, aqi: 132 },
  { id: "PR-1039", date: "2026-09-05 07:30", location: "Bengaluru, KA", tier: "safe" as RiskTier, score: 22, pm25: 14.8, aqi: 44 },
  { id: "PR-1038", date: "2026-09-04 18:05", location: "Delhi, NCR", tier: "severe" as RiskTier, score: 92, pm25: 148.3, aqi: 214 },
  { id: "PR-1037", date: "2026-09-04 09:22", location: "Kochi, KL", tier: "safe" as RiskTier, score: 27, pm25: 17.9, aqi: 49 },
  { id: "PR-1036", date: "2026-09-03 17:48", location: "Hyderabad, TS", tier: "moderate" as RiskTier, score: 54, pm25: 35.1, aqi: 88 },
  { id: "PR-1035", date: "2026-09-03 08:10", location: "Mumbai, MH", tier: "high" as RiskTier, score: 68, pm25: 57.6, aqi: 141 },
  { id: "PR-1034", date: "2026-09-02 20:15", location: "Pune, MH", tier: "moderate" as RiskTier, score: 49, pm25: 31.4, aqi: 84 },
  { id: "PR-1033", date: "2026-09-02 07:55", location: "Kolkata, WB", tier: "severe" as RiskTier, score: 88, pm25: 121.7, aqi: 196 },
  { id: "PR-1032", date: "2026-09-01 16:30", location: "Coimbatore, TN", tier: "safe" as RiskTier, score: 31, pm25: 19.2, aqi: 47 },
];

export const aqiTrend = [
  { date: "Aug 29", aqi: 62, pm25: 24 },
  { date: "Aug 30", aqi: 78, pm25: 31 },
  { date: "Aug 31", aqi: 91, pm25: 37 },
  { date: "Sep 01", aqi: 71, pm25: 28 },
  { date: "Sep 02", aqi: 104, pm25: 46 },
  { date: "Sep 03", aqi: 122, pm25: 55 },
  { date: "Sep 04", aqi: 143, pm25: 66 },
  { date: "Sep 05", aqi: 118, pm25: 51 },
  { date: "Sep 06", aqi: 96, pm25: 38 },
];

export const riskDistribution = [
  { name: "Safe", value: 38, tier: "safe" as RiskTier },
  { name: "Moderate", value: 31, tier: "moderate" as RiskTier },
  { name: "High", value: 19, tier: "high" as RiskTier },
  { name: "Severe", value: 12, tier: "severe" as RiskTier },
];

export const pollutantDistribution = [
  { name: "PM2.5", value: 38.4 },
  { name: "PM10", value: 74.1 },
  { name: "NO₂", value: 26.8 },
  { name: "SO₂", value: 11.2 },
  { name: "CO", value: 8.4 },
  { name: "O₃", value: 48.5 },
];

export const topPollutants = [
  { name: "PM10", share: 34 },
  { name: "PM2.5", share: 27 },
  { name: "O₃", share: 18 },
  { name: "NO₂", share: 12 },
  { name: "CO", share: 6 },
  { name: "SO₂", share: 3 },
];

export const riskScoreTrend = aqiTrend.map((d) => ({ date: d.date, score: Math.round(d.aqi * 0.62) }));

export const pipelineSteps = [
  {
    title: "Live Data Collection",
    body: "OpenWeather air-quality and weather endpoints, plus GPS or searched coordinates, supply six pollutants and three meteorological signals each time you check a location.",
  },
  {
    title: "Reading Buffer",
    body: "Each check adds one reading to a rolling window for that location; the model needs 16 readings before it can forecast.",
  },
  {
    title: "CNN-LSTM Forecasting",
    body: "1D convolutions extract short-range pollutant patterns; stacked LSTM layers carry the temporal signal to predict the CHANGE in PM2.5 from the 16-reading window. That change is added to the latest PM2.5 reading to give the final predicted value.",
  },
  {
    title: "Rule-Based Risk Classification",
    body: "The forecasted PM2.5 value is compared against fixed thresholds to classify environmental risk as Low, Moderate, High, or Very High.",
  },
  {
    title: "Personalized Health Assessment",
    body: "Your age, asthma severity, allergy status, smoking status, existing conditions, and outdoor exposure combine in a scoring algorithm, so the same air can read differently for two people.",
  },
  {
    title: "Smart Recommendations",
    body: "A rules layer maps your personalized risk level to specific, actionable advice you can follow today.",
  },
];


// Cities with a monitoring station in master_dataset.csv, the raw training
// data for the CNN-LSTM model. lat/lon are averaged across each city's
// stations; `stations` is the number of distinct station rows for that city.
export type TrainingCity = {
  name: string;
  state: string;
  lat: number;
  lon: number;
  stations: number;
};

export const trainingCities: TrainingCity[] = [
  { name: "New Delhi", state: "Delhi", lat: 28.615, lon: 77.235, stations: 3 },
  { name: "Mumbai", state: "Maharashtra", lat: 19.096, lon: 72.842, stations: 3 },
  { name: "Bengaluru", state: "Karnataka", lat: 12.914, lon: 77.595, stations: 1 },
  { name: "Ramanagara", state: "Karnataka", lat: 12.733, lon: 77.298, stations: 1 },
  { name: "Chennai", state: "Tamil Nadu", lat: 13.146, lon: 80.263, stations: 2 },
  { name: "Hyderabad", state: "Telangana", lat: 17.405, lon: 78.393, stations: 2 },
  { name: "Mangalore", state: "Karnataka", lat: 12.889, lon: 74.853, stations: 1 },
  { name: "Kanpur", state: "Uttar Pradesh", lat: 26.49, lon: 80.286, stations: 2 },
  { name: "Kolkata", state: "West Bengal", lat: 22.524, lon: 88.358, stations: 2 },
  { name: "Lucknow", state: "Uttar Pradesh", lat: 26.876, lon: 80.961, stations: 2 },
];