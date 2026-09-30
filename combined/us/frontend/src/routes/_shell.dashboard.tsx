import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Thermometer, Droplets, Wind, Activity, Wind as WindIcon, BarChart3, History, HeartPulse, Crosshair } from "lucide-react";
import { SkyBackground } from "@/components/SkyBackground";
import { RiskBadge } from "@/components/RiskBadge";
import { RISK_META, type RiskTier } from "@/lib/breathesafe";
import { getHistory, type PredictionRecord } from "@/lib/predictionHistory";

export const Route = createFileRoute("/_shell/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — BreatheSafe" },
      { name: "description", content: "Your live air quality, pollutant breakdown and asthma risk summary for today." },
      { property: "og:title", content: "Dashboard — BreatheSafe" },
      { property: "og:description", content: "Live AQI, pollutants and personalized asthma guidance in one view." },
    ],
  }),
  component: Dashboard,
});

const quickActions = [
  { to: "/predict", label: "Predict Risk", icon: WindIcon, body: "Run a prediction for any location" },
  { to: "/analytics", label: "Analytics", icon: BarChart3, body: "Trends, pollutants and model scores" },
  { to: "/history", label: "History", icon: History, body: "Every prediction you've made" },
  { to: "/health-tips", label: "Health Tips", icon: HeartPulse, body: "What to do at each AQI band" },
] as const;

const POLLUTANT_FIELDS = [
  { key: "pm25", label: "PM2.5", unit: "µg/m³" },
  { key: "pm10", label: "PM10", unit: "µg/m³" },
  { key: "no2", label: "NO₂", unit: "µg/m³" },
  { key: "so2", label: "SO₂", unit: "µg/m³" },
  { key: "co", label: "CO", unit: "mg/m³" },
  { key: "o3", label: "O₃", unit: "µg/m³" },
] as const;

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function Dashboard() {
  const [history, setHistory] = useState<PredictionRecord[]>(() => getHistory());

  useEffect(() => {
    function refresh() {
      setHistory(getHistory());
    }
    window.addEventListener("focus", refresh);
    return () => window.removeEventListener("focus", refresh);
  }, []);

  const latest = history[0];
  const tier: RiskTier = latest?.risk ?? "safe";
  const meta = RISK_META[tier];
  const today = new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" });

  return (
    <div>
      <section className="relative isolate overflow-hidden px-6 pb-28 pt-10">
        <SkyBackground tier={tier} />
        <div className="relative z-10 mx-auto flex max-w-6xl flex-wrap items-end justify-between gap-6">
          <div className="enter-up">
            <h1 className="text-4xl font-bold text-white">{greeting()}</h1>
            <p className="mt-2 text-white/85">
              {today} · {latest ? latest.location : "No location yet"}
            </p>
          </div>
          {latest?.weather && (
            <div className="enter-up flex flex-wrap gap-2">
              {[
                { icon: Thermometer, label: "Temp", value: `${Number(latest.weather.temperature).toFixed(1)}°C` },
                { icon: Droplets, label: "Humidity", value: `${Math.round(latest.weather.relativehumidity)}%` },
                { icon: Wind, label: "Wind", value: `${Number(latest.weather.wind_speed).toFixed(1)} m/s` },
                { icon: Activity, label: "AQI", value: `${latest.aqi}` },
              ].map((s) => (
                <div
                  key={s.label}
                  className="flex items-center gap-2 rounded-full bg-white/85 px-4 py-2 text-sm font-medium backdrop-blur"
                >
                  <s.icon className="h-4 w-4 text-primary" />
                  <span className="text-muted-foreground">{s.label}</span>
                  <span className="font-semibold">{s.value}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      <div className="mx-auto -mt-20 max-w-6xl px-6 pb-16">
        {!latest ? (
          <div className="enter-up flex flex-col items-center gap-4 rounded-3xl bg-surface p-14 text-center shadow-float">
            <Crosshair className="h-8 w-8 text-primary" />
            <h2 className="text-xl font-semibold">No predictions yet</h2>
            <p className="max-w-sm text-sm text-muted-foreground">
              Run a prediction on Predict Risk to see your live air quality and risk dashboard here.
            </p>
            <Link
              to="/predict"
              className="mt-2 rounded-2xl bg-sunset px-6 py-3 font-semibold text-primary-foreground transition-transform hover:-translate-y-0.5"
            >
              Go to Predict Risk
            </Link>
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
            <div className="enter-up rounded-3xl bg-surface p-7 shadow-float">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Latest air quality</p>
                  <div className="mt-2 flex items-end gap-4">
                    <span className="font-display text-6xl font-bold leading-none">{latest.aqi}</span>
                    <span className={`pb-2 text-sm font-semibold ${meta.text}`}>AQI</span>
                  </div>
                </div>
                <div className="text-right">
                  <RiskBadge tier={tier} />
                  <p className="mt-3 text-sm text-muted-foreground">
                    Risk score <span className="font-display text-xl font-bold text-foreground">{latest.score}</span>/100
                  </p>
                </div>
              </div>

              <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3">
                {POLLUTANT_FIELDS.map((p) => (
                  <div key={p.key} className="rounded-2xl border border-border p-4">
                    <p className="text-xs font-medium text-muted-foreground">{p.label}</p>
                    <p className="mt-1 font-display text-2xl font-bold">
                      {latest.pollutants ? Number(latest.pollutants[p.key as keyof typeof latest.pollutants]).toFixed(1) : "—"}
                    </p>
                    <p className="text-xs text-muted-foreground">{p.unit}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="enter-up rounded-3xl bg-surface p-7 shadow-card" style={{ animationDelay: "80ms" }}>
              <h2 className="text-xl font-semibold">Today's summary</h2>
              <dl className="mt-5 space-y-3 text-sm">
                {[
                  ["Air quality status", meta.label],
                  ["Environmental risk", latest.environmentalRisk || "—"],
                  ["Predicted PM2.5", `${latest.pm25} µg/m³`],
                  ["Last updated", latest.time || latest.date],
                ].map(([k, v]) => (
                  <div key={k} className="flex items-center justify-between border-b border-border pb-3">
                    <dt className="text-muted-foreground">{k}</dt>
                    <dd className="font-semibold">{v}</dd>
                  </div>
                ))}
              </dl>
              {latest.advice && latest.advice.length > 0 && (
                <>
                  <h3 className="mt-6 text-sm font-semibold">Recommended today</h3>
                  <ul className="mt-3 space-y-2.5">
                    {latest.advice.map((r) => (
                      <li key={r} className="flex gap-2.5 text-sm leading-relaxed text-muted-foreground">
                        <span className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${meta.dot}`} />
                        {r}
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </div>
          </div>
        )}

        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {quickActions.map((a) => (
            <Link
              key={a.to}
              to={a.to}
              className="rounded-2xl border border-border bg-surface p-5 transition-all hover:-translate-y-1 hover:border-primary/40"
            >
              <a.icon className="h-5 w-5 text-primary" />
              <p className="mt-4 font-semibold">{a.label}</p>
              <p className="mt-1 text-sm text-muted-foreground">{a.body}</p>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
