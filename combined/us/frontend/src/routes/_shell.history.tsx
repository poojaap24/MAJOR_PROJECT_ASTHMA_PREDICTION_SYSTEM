import { Fragment, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Download, Search } from "lucide-react";
import { RiskBadge } from "@/components/RiskBadge";
import { type RiskTier } from "@/lib/breathesafe";
import { getHistory } from "@/lib/predictionHistory";

export const Route = createFileRoute("/_shell/history")({
  head: () => ({
    meta: [
      { title: "Prediction History — BreatheSafe" },
      { name: "description", content: "Browse, filter and export every asthma risk prediction you've run." },
      { property: "og:title", content: "Prediction History — BreatheSafe" },
      { property: "og:description", content: "A searchable log of past risk predictions with AQI and PM2.5 values." },
    ],
  }),
  component: HistoryPage,
});

const filters: Array<{ id: "all" | RiskTier; label: string }> = [
  { id: "all", label: "All" },
  { id: "safe", label: "Safe" },
  { id: "moderate", label: "Moderate" },
  { id: "high", label: "High" },
  { id: "severe", label: "Severe" },
];

function HistoryPage() {
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<"all" | RiskTier>("all");
  const [open, setOpen] = useState<string | null>(null);

  const allRows = useMemo(
    () =>
      getHistory().map((r) => ({
        id: r.id,
        date: r.date,
        location: r.location,
        tier: r.risk,
        score: r.score,
        pm25: r.pm25,
        aqi: r.aqi,
        advice: r.advice,
      })),
    [],
  );

  const rows = useMemo(
    () =>
      allRows.filter(
        (r) =>
          (filter === "all" || r.tier === filter) &&
          r.location.toLowerCase().includes(q.trim().toLowerCase()),
      ),
    [allRows, q, filter],
  );

  function exportCsv() {
    const csv = [
      "id,date,location,risk,score,pm25,aqi",
      ...rows.map((r) => [r.id, r.date, r.location, r.tier, r.score, r.pm25, r.aqi].join(",")),
    ].join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "breathesafe-history.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="mx-auto max-w-6xl px-6 py-12">
      <div className="enter-up flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Prediction history</h1>
          <p className="mt-2 text-muted-foreground">{rows.length} of {allRows.length} predictions shown.</p>
        </div>
        <button
          onClick={exportCsv}
          className="inline-flex items-center gap-2 rounded-xl bg-sunset px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-transform hover:-translate-y-0.5"
        >
          <Download className="h-4 w-4" /> Export CSV
        </button>
      </div>

      <div className="mt-8 flex flex-wrap items-center gap-3">
        <div className="flex flex-1 min-w-56 items-center gap-2 rounded-xl border border-input bg-surface px-4">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by location"
            className="w-full bg-transparent py-2.5 text-sm outline-none"
          />
        </div>
        <div className="flex gap-1.5">
          {filters.map((f) => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                filter === f.id ? "bg-foreground text-background" : "bg-secondary text-muted-foreground hover:bg-accent"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-6 overflow-hidden rounded-2xl border border-border bg-surface">
        <table className="w-full text-sm">
          <thead className="bg-secondary/60 text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-5 py-3 font-medium">Date</th>
              <th className="px-5 py-3 font-medium">Location</th>
              <th className="px-5 py-3 font-medium">Risk</th>
              <th className="px-5 py-3 font-medium">Score</th>
              <th className="px-5 py-3 font-medium">PM2.5</th>
              <th className="px-5 py-3 font-medium">AQI</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <Fragment key={r.id}>
                <tr
                  onClick={() => setOpen(open === r.id ? null : r.id)}
                  className="cursor-pointer border-t border-border transition-colors hover:bg-secondary/50"
                >
                  <td className="px-5 py-3.5 text-muted-foreground">{r.date}</td>
                  <td className="px-5 py-3.5 font-medium">{r.location}</td>
                  <td className="px-5 py-3.5"><RiskBadge tier={r.tier} size="sm" /></td>
                  <td className="px-5 py-3.5 font-display font-semibold">{r.score}</td>
                  <td className="px-5 py-3.5">{r.pm25}</td>
                  <td className="px-5 py-3.5">{r.aqi}</td>
                </tr>
                {open === r.id && (
                  <tr className="border-t border-border bg-secondary/30">
                    <td colSpan={6} className="px-5 py-4 text-sm text-muted-foreground">
                      {r.advice && r.advice.length > 0 ? r.advice.join(" · ") : "No advice recorded for this prediction."}
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
            {rows.length === 0 && (
              <tr className="border-t border-border">
                <td colSpan={6} className="px-5 py-10 text-center text-muted-foreground">
                  No predictions match those filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
