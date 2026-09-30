// Thin client for the existing Express API (backend/server.js).
// Nothing here changes the backend — it only calls the routes that
// already exist there. Base URL is read from VITE_API_BASE_URL.

const BASE_URL = import.meta.env["VITE_API_BASE_URL"] || "http://localhost:5000";

async function request(path: string, options: RequestInit = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    // server.js reports errors as { error: "..." }
    throw new Error(body.error || body.message || `Request failed: ${res.status}`);
  }
  return res.json();
}

export type AirReading = {
  pm25: number;
  pm10: number;
  no2: number;
  co: number;
  so2: number;
  o3: number;
  temperature: number;
  relativehumidity: number;
  wind_speed: number;
};

export type UserProfile = {
  age: number;
  severity: "mild" | "moderate" | "severe";
  allergy: boolean;
  smoker: boolean;
  condition: "none" | "copd" | "bronchitis" | "heart";
  outdoorExposure: boolean;
};

export const api = {
  // GET /test
  healthCheck: () => request("/test"),

  // GET /geocode?lat=&lon=
  geocode: (lat: number, lon: number) => request(`/geocode?lat=${lat}&lon=${lon}`),

  // GET /air?lat=&lon=&location= — adds a live reading to that location's buffer
  fetchAir: (
    lat: number,
    lon: number,
    location: string
  ): Promise<{ success: boolean; data: AirReading & { aqi: number }; bufferStatus: string }> =>
    request(`/air?lat=${lat}&lon=${lon}&location=${encodeURIComponent(location)}`),

  // POST /api/test-add-reading — demo-only seed, bypasses the OpenWeatherMap wait
  seedReading: (payload: { location: string; reading: AirReading }) =>
    request("/api/test-add-reading", { method: "POST", body: JSON.stringify(payload) }),

  // POST /api/predict-risk — { location, user: { age, severity, allergy, smoker, condition, outdoorExposure } }
  predictRisk: (
    location: string,
    user: UserProfile
  ): Promise<{
    success: boolean;
    predicted_pm25: number;
    last_known_pm25?: number;
    predicted_change?: number;
    model?: string;
    environmental_risk: "LOW" | "MODERATE" | "HIGH" | "VERY HIGH";
    personalized_risk: "LOW" | "MODERATE" | "HIGH" | "VERY HIGH";
    advice: string[];
  }> =>
    request("/api/predict-risk", {
      method: "POST",
      body: JSON.stringify({ location, user }),
    }),

  // GET /api-usage
  apiUsage: () => request("/api-usage"),

  // GET /api/model-metrics
  modelMetrics: () => request("/api/model-metrics"),

  // POST /api/chat — { message, predictionData }
  chat: (message: string, predictionData: unknown): Promise<{ reply: string }> =>
    request("/api/chat", {
      method: "POST",
      body: JSON.stringify({ message, predictionData }),
    }),
};

export default api;