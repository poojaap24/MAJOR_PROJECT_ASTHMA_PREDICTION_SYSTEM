// Real prediction history — persisted in localStorage. Every call to
// Predict appends here, so Dashboard/History/Analytics show real runs
// instead of hardcoded rows. No backend endpoint needed for this.

const KEY = "breathesafe_prediction_history_v1";
const MAX_ENTRIES = 100;

export type PredictionRecord = {
  id: string;
  timestamp: string;
  date: string;
  time: string;
  location: string;
  risk: "safe" | "moderate" | "high" | "severe";
  score: string | number;
  pm25: string | number;
  aqi: number;
  environmentalRisk?: string;
  advice?: string[];
  pollutants?: { pm25: number; pm10: number; no2: number; so2: number; co: number; o3: number };
  weather?: { temperature: number; relativehumidity: number; wind_speed: number };
};

export function getHistory(): PredictionRecord[] {
  try {
    const raw = localStorage.getItem(KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function addPrediction(entry: Omit<PredictionRecord, "id" | "timestamp" | "date" | "time">) {
  const now = new Date();
  const record: PredictionRecord = {
    id: `${now.getTime()}`,
    timestamp: now.toISOString(),
    date: now.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }),
    time: now.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }),
    ...entry,
  };
  const updated = [record, ...getHistory()].slice(0, MAX_ENTRIES);
  try {
    localStorage.setItem(KEY, JSON.stringify(updated));
  } catch {
    // localStorage unavailable (private mode etc.) — degrade silently
  }
  return updated;
}

export function clearHistory() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // ignore
  }
}
