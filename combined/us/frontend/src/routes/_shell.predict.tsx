import { useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { LocateFixed, Search, Loader2, AlertTriangle } from "lucide-react";
import { SkyBackground } from "@/components/SkyBackground";
import { RiskBadge } from "@/components/RiskBadge";
import LocationMap from "@/components/LocationMap";
import { RISK_META, tierFromAqi, type RiskTier } from "@/lib/breathesafe";
import { api } from "@/lib/api";
import { getUserProfile } from "@/lib/userProfile";
import { addPrediction } from "@/lib/predictionHistory";
import { pm25ToAqi, BACKEND_RISK_MAP } from "@/lib/aqi";

export const Route = createFileRoute("/_shell/predict")({
  head: () => ({
    meta: [
      { title: "Predict Risk — BreatheSafe" },
      { name: "description", content: "Search a city or use your location to predict asthma risk from live air quality." },
      { property: "og:title", content: "Predict Risk — BreatheSafe" },
      { property: "og:description", content: "Run an AI asthma risk prediction for any location." },
    ],
  }),
  component: Predict,
});

type Result = {
  location: string;
  tier: RiskTier;
  aqi: number;
  pm25: number;
  environmentalRisk: string;
  envTier: RiskTier;
  advice: string[];
  lastKnown: number | null;
  change: number | null;
  model: string;
};

const FALLBACK_ADVICE: Record<RiskTier, string[]> = {
  safe: ["Air quality is acceptable.", "Normal outdoor activities are safe."],
  moderate: ["Reduce prolonged outdoor exposure.", "Carry your inhaler if prescribed."],
  high: ["Avoid strenuous outdoor activities.", "Wear an N95 mask.", "Keep rescue inhaler nearby."],
  severe: ["Stay indoors whenever possible.", "Close windows.", "Use an air purifier if available.", "Keep emergency medication ready."],
};

function jitter() {
  return 1 + (Math.random() - 0.5) * 0.1; // +/-5%
}

function Predict() {
  const [query, setQuery] = useState("");
  const [pin, setPin] = useState<{ lat: number; lon: number } | null>(null);
  const [locationName, setLocationName] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "error" | "done">("idle");
  const [loadingStep, setLoadingStep] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState("");
  const [locating, setLocating] = useState(false);
  const pickSeq = useRef(0);

  const tier = result?.tier ?? "safe";

  function useMyLocation() {
    setError("");
    setResult(null);
    if (!navigator.geolocation) {
      setError("Your browser doesn't support geolocation. Try searching instead.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude, accuracy } = pos.coords;
        pickSeq.current++;
        setLocating(false);
        setPin({ lat: latitude, lon: longitude });
        console.log(`Got location: ${latitude}, ${longitude} (accuracy: ~${Math.round(accuracy)}m)`);
        try {
          const geo = await api.geocode(latitude, longitude);
          setLocationName(geo.name || "Your location");
        } catch {
          setLocationName("Your location");
        }
      },
      () => setError("Couldn't get your location (permission denied?). Try searching instead."),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  }

  // Called when the user clicks on the map: select that exact point and
  // reverse-geocode it into a readable place name.
  async function pickOnMap(lat: number, lon: number) {
    const seq = ++pickSeq.current;
    setError("");
    setResult(null);
    setStatus("idle");
    setPin({ lat, lon });
    setLocating(true);
    setLocationName("Finding place name…");

    let name = `${lat.toFixed(3)}, ${lon.toFixed(3)}`;
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&zoom=10&lat=${lat}&lon=${lon}`
      );
      const data = await res.json();
      const a = data?.address ?? {};
      const place = a.city || a.town || a.village || a.municipality || a.suburb || a.county || a.state_district;
      const parts = [place, a.state].filter(Boolean);
      if (parts.length) name = parts.join(", ");
    } catch {
      // keep the coordinates as the name
    }
    if (seq !== pickSeq.current) return; // a newer click won
    setLocationName(name);
    setLocating(false);
  }

  async function handleSearch() {
    if (!query.trim()) return;
    pickSeq.current++;
    setLocating(false);
    setError("");
    setResult(null);
    setStatus("idle");
    try {
      // Free OpenStreetMap Nominatim geocoding — no API key, doesn't touch the backend.
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(query)}`
      );
      const data = await res.json();
      if (!data.length) {
        setError(`Couldn't find "${query}". Try a more specific place name.`);
        return;
      }
      const { lat, lon, display_name } = data[0];
      setPin({ lat: Number(lat), lon: Number(lon) });
      setLocationName(display_name.split(",").slice(0, 2).join(","));
    } catch {
      setError("Search failed — check your internet connection.");
    }
  }

  async function run() {
    if (!pin) {
      setError("Search a city or use My Location first.");
      setStatus("error");
      return;
    }
    setError("");
    setStatus("loading");
    setLoadingStep("Fetching live air quality…");

    try {
      const name = locationName || query || "Selected location";
      const air = await api.fetchAir(pin.lat, pin.lon, name);

      // The model needs 16 readings for this location before it can run.
      // In production that fills up naturally (one /air call every 15 min).
      // For demo purposes, top it up immediately with the backend's own
      // test-add-reading route (same one the old frontend used).
      const have = Number((air.bufferStatus || "0/16").split("/")[0]) || 0;
      if (have < 16) {
        setLoadingStep("Priming the prediction window (demo seed)…");
        const base = air.data;
        for (let i = have; i < 16; i++) {
          await api.seedReading({
            location: name,
            reading: {
              pm25: base.pm25 * jitter(),
              pm10: base.pm10 * jitter(),
              no2: base.no2 * jitter(),
              co: base.co * jitter(),
              so2: base.so2 * jitter(),
              o3: base.o3 * jitter(),
              temperature: base.temperature,
              relativehumidity: base.relativehumidity,
              wind_speed: base.wind_speed,
            },
          });
        }
      }

      setLoadingStep("Running CNN-LSTM forecast…");
      const user = getUserProfile();
      const prediction = await api.predictRisk(name, user);

      const resolvedTier = BACKEND_RISK_MAP[prediction.personalized_risk] || "moderate";
      const aqi = pm25ToAqi(prediction.predicted_pm25);
      const advice = prediction.advice?.length ? prediction.advice : FALLBACK_ADVICE[resolvedTier];

      const envTier = BACKEND_RISK_MAP[String(prediction.environmental_risk).toUpperCase()] || tierFromAqi(aqi);

      setResult({
        location: name,
        tier: resolvedTier,
        envTier,
        aqi,
        pm25: Number(prediction.predicted_pm25.toFixed(1)),
        environmentalRisk: prediction.environmental_risk,
        advice,
        lastKnown: typeof prediction.last_known_pm25 === "number" ? prediction.last_known_pm25 : null,
        change: typeof prediction.predicted_change === "number" ? prediction.predicted_change : null,
        model: prediction.model || "CNN-LSTM",
      });

      addPrediction({
        location: name,
        risk: resolvedTier,
        score: Math.min(100, Number(prediction.predicted_pm25) * 1.1).toFixed(1),
        pm25: prediction.predicted_pm25.toFixed(1),
        aqi,
        environmentalRisk: prediction.environmental_risk,
        advice,
        pollutants: {
          pm25: air.data.pm25,
          pm10: air.data.pm10,
          no2: air.data.no2,
          so2: air.data.so2,
          co: air.data.co,
          o3: air.data.o3,
        },
        weather: {
          temperature: air.data.temperature,
          relativehumidity: air.data.relativehumidity,
          wind_speed: air.data.wind_speed,
        },
      });

      setStatus("done");
    } catch (err) {
      setError((err as Error).message || "Prediction failed. Is the backend running?");
      setStatus("error");
    }
  }

  return (
    <div>
      <section className="relative isolate overflow-hidden px-6 pb-12 pt-16">
        <SkyBackground tier={tier} />
        <div className="relative z-10 mx-auto max-w-3xl text-center">
          <h1 className="text-4xl font-bold text-white sm:text-5xl">Where do you want to breathe?</h1>
          <p className="mt-3 text-white/85">
            Search a city or use your location — we'll pull live pollutants and score the risk for your profile.
          </p>
        </div>

        <div className="glass-card enter-up relative z-10 mx-auto mt-10 max-w-3xl rounded-3xl p-6">
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="flex flex-1 items-center gap-3 rounded-2xl border border-border bg-white/80 px-4">
              <Search className="h-4 w-4 text-muted-foreground" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                placeholder="Search a city — try Delhi or Bengaluru"
                className="w-full bg-transparent py-3.5 text-sm outline-none placeholder:text-muted-foreground"
              />
            </div>
            <button
              onClick={handleSearch}
              className="rounded-2xl bg-sunset px-7 py-3.5 font-semibold text-primary-foreground transition-transform hover:-translate-y-0.5"
            >
              Go
            </button>
            <button
              onClick={useMyLocation}
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-border bg-white/70 px-5 py-3.5 text-sm font-medium transition-colors hover:bg-white"
            >
              <LocateFixed className="h-4 w-4" /> My location
            </button>
          </div>

          {locationName && (
            <p className="mt-4 text-sm text-white/90">
              Selected: <span className="font-semibold">{locationName}</span>
            </p>
          )}

          <div className="mt-4 overflow-hidden rounded-2xl border border-white/30">
            <LocationMap pin={pin} onPick={pickOnMap} />
          </div>
          <p className="mt-2 text-center text-xs text-white/80">
            Tip: click anywhere on the map to select that exact location.
          </p>
        </div>
      </section>

      <div className="relative z-10 mx-auto mt-10 grid max-w-6xl gap-6 px-6 pb-16 lg:grid-cols-[1.3fr_1fr]">
        <div className="rounded-3xl bg-surface p-6 shadow-float">
          <h2 className="text-lg font-semibold">Run the prediction</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Once a location is selected above, run the model against live air quality data.
          </p>

          <button
            onClick={run}
            disabled={status === "loading" || locating || !pin}
            className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-sunset py-4 font-semibold text-primary-foreground transition-transform hover:-translate-y-0.5 disabled:opacity-50"
          >
            {status === "loading" && <Loader2 className="h-4 w-4 animate-spin" />}
            {status === "loading" ? (loadingStep || "Running model…") : "Predict Risk"}
          </button>

          {error && (
            <p className="mt-3 text-sm text-severe">{error}</p>
          )}
        </div>

        <div className="rounded-3xl bg-surface p-6 shadow-card">
          <h2 className="text-lg font-semibold">Prediction result</h2>

          {status === "idle" && (
            <p className="mt-6 text-sm leading-relaxed text-muted-foreground">
              Pick a location above and run the model. Results include the risk tier, PM2.5, AQI and advice
              weighted by your health profile.
            </p>
          )}

          {status === "loading" && (
            <div className="mt-6 space-y-3">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="h-12 animate-pulse rounded-xl bg-secondary" />
              ))}
            </div>
          )}

          {status === "error" && (
            <div className="mt-6 flex gap-3 rounded-2xl bg-severe-soft p-4 text-sm text-severe">
              <AlertTriangle className="h-5 w-5 shrink-0" />
              <p>{error || "We couldn't reach the air quality service for that location."}</p>
            </div>
          )}

          {status === "done" && result && (
            <div className="mt-5">
              <div className="flex items-center justify-between">
                <p className="font-display text-xl font-semibold">{result.location}</p>
                <RiskBadge tier={result.tier} />
              </div>
              <div className="mt-5 grid grid-cols-2 gap-3">
                {[
                  ["AQI", result.aqi],
                  ["PM2.5", result.pm25],
                ].map(([k, v]) => (
                  <div key={k as string} className="rounded-2xl border border-border p-4">
                    <p className="text-xs text-muted-foreground">{k}</p>
                    <p className="mt-1 font-display text-2xl font-bold">{v}</p>
                  </div>
                ))}
              </div>
              <div className="mt-5 space-y-1.5 text-sm">
                <p>
                  <span className="text-muted-foreground">Environmental risk: </span>
                  <span className={`font-semibold ${RISK_META[result.envTier].text}`}>{result.environmentalRisk}</span>
                </p>
                <p>
                  <span className="text-muted-foreground">Your personalized risk: </span>
                  <span className={`font-semibold ${RISK_META[result.tier].text}`}>{RISK_META[result.tier].label}</span>
                </p>
              </div>
              {result.lastKnown !== null && result.change !== null && (
                <div className="mt-5 rounded-2xl bg-secondary/60 p-4 text-sm">
                  <p className="font-semibold">How this PM2.5 was predicted</p>
                  <p className="mt-1.5 leading-relaxed text-muted-foreground">
                    The {result.model} model predicts the <strong className="text-foreground">change</strong> in PM2.5,
                    and that change is added to the latest PM2.5 reading to get the final predicted value.
                  </p>
                  <p className="mt-2 font-medium">
                    {result.lastKnown.toFixed(1)} {result.change >= 0 ? "+" : "−"} {Math.abs(result.change).toFixed(1)} ={" "}
                    {result.pm25.toFixed(1)} µg/m³
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Latest reading + predicted change = predicted PM2.5
                  </p>
                </div>
              )}
              <p className="mt-3 text-xs text-muted-foreground">Model used: {result.model}</p>
              <ul className="mt-4 space-y-2.5">
                {result.advice.map((r) => (
                  <li key={r} className="flex gap-2.5 text-sm leading-relaxed text-muted-foreground">
                    <span className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${RISK_META[result.tier].dot}`} />
                    {r}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}