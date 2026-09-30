import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Activity, Brain, CloudSun, HeartPulse, ArrowRight } from "lucide-react";
import { SkyBackground } from "@/components/SkyBackground";
import { pipelineSteps, tierFromAqi } from "@/lib/breathesafe";
import { RiskBadge } from "@/components/RiskBadge";
import { getHistory, type PredictionRecord } from "@/lib/predictionHistory";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "BreatheSafe — Protect Every Breath with AI" },
      {
        name: "description",
        content:
          "Live air quality plus your health profile, turned into a real-time asthma risk score and advice you can act on.",
      },
      { property: "og:title", content: "BreatheSafe — Protect Every Breath with AI" },
      {
        property: "og:description",
        content: "Real-time asthma risk prediction from live pollution data and your personal health profile.",
      },
    ],
  }),
  component: Landing,
});

const features = [
  {
    icon: CloudSun,
    title: "Live AQI Monitoring",
    body: "Six pollutants and four weather signals refreshed every 15 minutes for your exact coordinates.",
  },
  {
    icon: Brain,
    title: "AI Forecasting",
    body: "A CNN-LSTM model predicts the change in PM2.5 and adds it to the latest reading to forecast the next value.",
  },
  {
    icon: Activity,
    title: "Asthma Risk Prediction",
    body: "Forecast PM2.5 is classified with fixed thresholds into a clear Low, Moderate, High or Very High risk level.",
  },
  {
    icon: HeartPulse,
    title: "Personalized Advice",
    body: "Guidance weighted by your age, asthma severity, allergies, smoking, existing conditions and outdoor exposure.",
  },
];

function Landing() {
  const [latest, setLatest] = useState<PredictionRecord | undefined>(() => getHistory()[0]);

  useEffect(() => {
    function refresh() {
      setLatest(getHistory()[0]);
    }
    window.addEventListener("focus", refresh);
    return () => window.removeEventListener("focus", refresh);
  }, []);

  const tier = latest ? tierFromAqi(latest.aqi) : "safe";
  const pollutantEntries = latest?.pollutants
    ? [
        { key: "PM2.5", value: latest.pollutants.pm25 },
        { key: "PM10", value: latest.pollutants.pm10 },
        { key: "NO₂", value: latest.pollutants.no2 },
      ]
    : [];

  return (
    <div className="min-h-screen bg-background">
      <section className="relative isolate min-h-[92vh] overflow-hidden">
        <SkyBackground tier={tier} />

        <header className="relative z-10 mx-auto flex max-w-7xl items-center justify-between px-6 py-6">
          <span className="font-display text-xl font-bold text-white">BreatheSafe</span>
          <nav className="flex items-center gap-2">
            <Link
              to="/login"
              className="rounded-full px-4 py-2 text-sm font-medium text-white/90 transition-colors hover:bg-white/15 hover:text-white"
            >
              Sign in
            </Link>
            <Link
              to="/signup"
              className="rounded-full bg-sunset px-5 py-2 text-sm font-semibold text-primary-foreground shadow-float transition-transform hover:-translate-y-0.5"
            >
              Get started
            </Link>
          </nav>
        </header>

        <div className="relative z-10 mx-auto grid max-w-7xl gap-10 px-6 pb-24 pt-16 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
          <div className="enter-up">
            <h1 className="max-w-2xl text-5xl font-bold leading-[1.05] text-white sm:text-6xl lg:text-7xl">
              Protect every breath with air intelligence
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-white/85">
              BreatheSafe reads the air around you in real time, forecasts where it's heading, and
              translates it into an asthma risk score built for your lungs — not the average person's.
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Link
                to="/dashboard"
                className="inline-flex items-center gap-2 rounded-full bg-sunset px-7 py-3.5 font-semibold text-primary-foreground shadow-float transition-transform hover:-translate-y-0.5"
              >
                Start monitoring <ArrowRight className="h-4 w-4" />
              </Link>
              <a
                href="#how-it-works"
                className="inline-flex items-center rounded-full border border-white/40 px-7 py-3.5 font-semibold text-white transition-colors hover:bg-white/15"
              >
                How it works
              </a>
            </div>
          </div>

          <div className="glass-card enter-up rounded-3xl p-6" style={{ animationDelay: "120ms" }}>
            {latest ? (
              <>
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Live now</p>
                    <p className="font-display text-xl font-semibold">{latest.location}</p>
                  </div>
                  <RiskBadge tier={tier} />
                </div>
                <div className="mt-6 flex items-end gap-3">
                  <span className="font-display text-6xl font-bold leading-none">{latest.aqi}</span>
                  <span className="pb-2 text-sm text-muted-foreground">AQI · risk {latest.score}/100</span>
                </div>
                {pollutantEntries.length > 0 && (
                  <div className="mt-6 grid grid-cols-3 gap-3">
                    {pollutantEntries.map((p) => (
                      <div key={p.key} className="rounded-xl bg-white/70 px-3 py-2.5">
                        <p className="text-xs text-muted-foreground">{p.key}</p>
                        <p className="font-display text-lg font-semibold">{p.value}</p>
                      </div>
                    ))}
                  </div>
                )}
                {latest.advice && latest.advice[0] && (
                  <p className="mt-5 text-sm leading-relaxed text-muted-foreground">{latest.advice[0]}</p>
                )}
              </>
            ) : (
              <>
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Live now</p>
                    <p className="font-display text-xl font-semibold">No location checked yet</p>
                  </div>
                  <RiskBadge tier="safe" />
                </div>
                <p className="mt-6 text-sm leading-relaxed text-muted-foreground">
                  Run your first check to see real live AQI, risk score and pollutant readings for your location right
                  here.
                </p>
                <a
                  href="/predict"
                  className="mt-5 inline-flex items-center gap-2 rounded-full bg-sunset px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-float transition-transform hover:-translate-y-0.5"
                >
                  Check your air now <ArrowRight className="h-4 w-4" />
                </a>
              </>
            )}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-24">
        <h2 className="max-w-2xl text-3xl font-bold sm:text-4xl">
          Four systems working together on one question: is it safe to breathe out there?
        </h2>
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((f) => (
            <article
              key={f.title}
              className="rounded-2xl border border-border bg-surface p-6 transition-all hover:-translate-y-1 hover:shadow-card"
            >
              <f.icon className="h-6 w-6 text-primary" />
              <h3 className="mt-5 text-lg font-semibold">{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{f.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="how-it-works" className="border-y border-border bg-secondary/40 py-24">
        <div className="mx-auto max-w-7xl px-6">
          <h2 className="text-3xl font-bold sm:text-4xl">How it works</h2>
          <p className="mt-3 max-w-2xl text-muted-foreground">
            Six stages take raw sensor readings to advice you can act on in under two seconds.
          </p>
          <ol className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {pipelineSteps.map((step, i) => (
              <li key={step.title} className="rounded-2xl bg-surface p-6 shadow-card">
                <span className="font-display text-sm font-bold text-primary">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <h3 className="mt-3 text-lg font-semibold">{step.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{step.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <footer className="mx-auto flex max-w-7xl flex-col gap-2 px-6 py-14 sm:flex-row sm:items-center sm:justify-between">
        <span className="font-display text-lg font-bold">BreatheSafe</span>
        <p className="text-sm text-muted-foreground">
          AI-powered asthma risk prediction — a final-year engineering project on air, health and machine learning.
        </p>
      </footer>
    </div>
  );
}