import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  PolarAngleAxis,
  RadialBar,
  RadialBarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { RISK_HEX } from "@/lib/breathesafe";
import { getHistory, type PredictionRecord } from "@/lib/predictionHistory";
import { api } from "@/lib/api";

export const Route = createFileRoute("/_shell/analytics")({
  head: () => ({
    meta: [
      { title: "Analytics — BreatheSafe" },
      { name: "description", content: "AQI trends, risk distribution, pollutant breakdowns and model validation scores from your real prediction history." },
      { property: "og:title", content: "Analytics — BreatheSafe" },
      { property: "og:description", content: "Air intelligence at a glance: trends, distributions and model performance." },
    ],
  }),
  component: Analytics,
});

const AXIS = { stroke: "oklch(0.55 0.015 258)", fontSize: 12 };
const POLLUTANT_KEYS = ["pm25", "pm10", "no2", "so2", "co", "o3"] as const;
const POLLUTANT_LABELS: Record<(typeof POLLUTANT_KEYS)[number], string> = {
  pm25: "PM2.5",
  pm10: "PM10",
  no2: "NO₂",
  so2: "SO₂",
  co: "CO",
  o3: "O₃",
};

function Panel({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-border bg-surface p-6">
      <h2 className="text-base font-semibold">{title}</h2>
      {subtitle && <p className="mt-0.5 text-sm text-muted-foreground">{subtitle}</p>}
      <div className="mt-5 h-64">{children}</div>
    </section>
  );
}

function EmptyPanel() {
  return <div className="flex h-full items-center justify-center text-sm text-muted-foreground">No data yet</div>;
}

function Analytics() {
  const history = useMemo<PredictionRecord[]>(() => getHistory(), []);
  const [r2Pct, setR2Pct] = useState<number | null>(null);

  useEffect(() => {
    api
      .modelMetrics()
      .then((m: { unseen_city_test?: { R2?: number } }) => {
        if (typeof m?.unseen_city_test?.R2 === "number") {
          setR2Pct(Math.round(m.unseen_city_test.R2 * 100));
        }
      })
      .catch(() => setR2Pct(null));
  }, []);

  // Chronological (oldest -> newest), history is stored newest-first.
  const chronological = useMemo(() => [...history].reverse(), [history]);

  const aqiTrend = useMemo(
    () => chronological.map((r) => ({ date: r.date, aqi: r.aqi, pm25: Number(r.pm25) })),
    [chronological],
  );

  const riskScoreTrend = useMemo(
    () => chronological.map((r) => ({ date: r.date, score: Number(r.score) })),
    [chronological],
  );

  const riskDistribution = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const r of history) counts[r.risk] = (counts[r.risk] || 0) + 1;
    return Object.entries(counts).map(([tier, value]) => ({ name: tier, tier: tier as keyof typeof RISK_HEX, value }));
  }, [history]);

  const pollutantAverages = useMemo(() => {
    const withPollutants = history.filter((r) => r.pollutants);
    if (!withPollutants.length) return [];
    return POLLUTANT_KEYS.map((key) => {
      const total = withPollutants.reduce((sum, r) => sum + Number(r.pollutants![key] ?? 0), 0);
      return { name: POLLUTANT_LABELS[key], value: Number((total / withPollutants.length).toFixed(1)) };
    });
  }, [history]);

  const topPollutants = useMemo(() => {
    const total = pollutantAverages.reduce((sum, p) => sum + p.value, 0);
    if (!total) return [];
    return pollutantAverages
      .map((p) => ({ name: p.name, share: Math.round((p.value / total) * 100) }))
      .sort((a, b) => b.share - a.share)
      .slice(0, 5);
  }, [pollutantAverages]);

  const cityCount = useMemo(() => new Set(history.map((r) => r.location)).size, [history]);

  return (
    <div className="mx-auto max-w-6xl px-6 py-12">
      <div className="enter-up flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Air intelligence at a glance</h1>
          <p className="mt-2 text-muted-foreground">
            <span className="font-display text-xl font-bold text-foreground">{history.length}</span>{" "}
            {history.length === 1 ? "prediction" : "predictions"} run
            {cityCount > 0 && ` across ${cityCount} ${cityCount === 1 ? "location" : "locations"}`}.
          </p>
        </div>
      </div>

      <div className="mt-8 grid gap-5 lg:grid-cols-2">
        <Panel title="AQI trend" subtitle="One point per prediction you've run, in order">
          {aqiTrend.length ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={aqiTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.92 0.006 255)" vertical={false} />
                <XAxis dataKey="date" tickLine={false} axisLine={false} {...AXIS} />
                <YAxis tickLine={false} axisLine={false} {...AXIS} />
                <Tooltip />
                <Line type="monotone" dataKey="aqi" stroke="#ff6b4a" strokeWidth={3} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <EmptyPanel />
          )}
        </Panel>

        <Panel title="Risk distribution" subtitle="Share of predictions by tier">
          {riskDistribution.length ? (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={riskDistribution} dataKey="value" nameKey="name" innerRadius={62} outerRadius={92} paddingAngle={3}>
                  {riskDistribution.map((d) => (
                    <Cell key={d.name} fill={RISK_HEX[d.tier]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <EmptyPanel />
          )}
        </Panel>

        <Panel title="Pollutant averages" subtitle="Mean of your live readings, by pollutant">
          {pollutantAverages.length ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={pollutantAverages}>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.92 0.006 255)" vertical={false} />
                <XAxis dataKey="name" tickLine={false} axisLine={false} {...AXIS} />
                <YAxis tickLine={false} axisLine={false} {...AXIS} />
                <Tooltip />
                <Bar dataKey="value" fill="#f5a623" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyPanel />
          )}
        </Panel>

        <Panel title="Top pollutants" subtitle="Share of average pollutant load (%)">
          {topPollutants.length ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topPollutants} layout="vertical" margin={{ left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.92 0.006 255)" horizontal={false} />
                <XAxis type="number" tickLine={false} axisLine={false} {...AXIS} />
                <YAxis type="category" dataKey="name" width={56} tickLine={false} axisLine={false} {...AXIS} />
                <Tooltip />
                <Bar dataKey="share" fill="#ff6b4a" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyPanel />
          )}
        </Panel>

        <Panel title="Model validation score" subtitle="Unseen-city R² — generalisation to cities never trained on, from GET /api/model-metrics">
          {r2Pct !== null ? (
            <div className="relative h-full">
              <ResponsiveContainer width="100%" height="100%">
                <RadialBarChart
                  data={[{ name: "R²", value: r2Pct, fill: "#f5a623" }]}
                  innerRadius="72%"
                  outerRadius="100%"
                  startAngle={210}
                  endAngle={-30}
                >
                  <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
                  <RadialBar dataKey="value" cornerRadius={12} background />
                </RadialBarChart>
              </ResponsiveContainer>
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                <span className="font-display text-4xl font-bold">{r2Pct}%</span>
                <span className="text-xs text-muted-foreground">unseen-city R²</span>
              </div>
            </div>
          ) : (
            <EmptyPanel />
          )}
        </Panel>

        <Panel title="PM2.5 trend" subtitle="Predicted PM2.5 per run, µg/m³">
          {aqiTrend.length ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={aqiTrend}>
                <defs>
                  <linearGradient id="pmFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#f5a623" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="#f5a623" stopOpacity={0.04} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.92 0.006 255)" vertical={false} />
                <XAxis dataKey="date" tickLine={false} axisLine={false} {...AXIS} />
                <YAxis tickLine={false} axisLine={false} {...AXIS} />
                <Tooltip />
                <Area type="monotone" dataKey="pm25" stroke="#f5a623" strokeWidth={2.5} fill="url(#pmFill)" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <EmptyPanel />
          )}
        </Panel>
      </div>

      <div className="mt-5">
        <Panel title="Risk score trend" subtitle="Personalized score by prediction">
          {riskScoreTrend.length ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={riskScoreTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.92 0.006 255)" vertical={false} />
                <XAxis dataKey="date" tickLine={false} axisLine={false} {...AXIS} />
                <YAxis tickLine={false} axisLine={false} {...AXIS} />
                <Tooltip />
                <Bar dataKey="score" radius={[6, 6, 0, 0]}>
                  {riskScoreTrend.map((d, i) => (
                    <Cell
                      key={`${d.date}-${i}`}
                      fill={d.score > 80 ? RISK_HEX.severe : d.score > 60 ? RISK_HEX.high : d.score > 40 ? RISK_HEX.moderate : RISK_HEX.safe}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyPanel />
          )}
        </Panel>
      </div>
    </div>
  );
}
