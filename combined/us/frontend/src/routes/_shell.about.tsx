import { createFileRoute } from "@tanstack/react-router";
import { Building2, MessageSquareWarning } from "lucide-react";

export const Route = createFileRoute("/_shell/about")({
  head: () => ({
    meta: [
      { title: "About the Project — BreatheSafe" },
      { name: "description", content: "The problem BreatheSafe solves, the stack behind it and where the project goes next." },
      { property: "og:title", content: "About the Project — BreatheSafe" },
      { property: "og:description", content: "Objective, problem statement, technologies and roadmap for BreatheSafe." },
    ],
  }),
  component: About,
});

const tech = [
  "React",
  "Node.js / Express",
  "Python",
  "TensorFlow",
  "CNN-LSTM",
  "OpenWeather API",
  "SQLite",
  "JWT Auth",
];

const roadmap = [
  { icon: Building2, title: "Hospital integration", body: "Share risk history with a clinician during reviews." },
  { icon: MessageSquareWarning, title: "Emergency SMS alerts", body: "Offline-safe warnings when severe air is forecast nearby." },
];

function About() {
  return (
    <div className="mx-auto max-w-5xl px-6 py-12">
      <div className="enter-up">
        <h1 className="text-3xl font-bold">About BreatheSafe</h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          A final-year engineering project on air quality, respiratory health and applied machine learning.
        </p>
      </div>

      <div className="mt-10 grid gap-5 md:grid-cols-2">
        <section className="rounded-2xl border border-border bg-surface p-6">
          <h2 className="text-lg font-semibold">Objective</h2>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            Build a system that fuses live pollution data with an individual's health profile to produce a personalized,
            explainable asthma risk score — and turn that score into advice a person can act on the same day, not a
            statistic they read afterwards.
          </p>
        </section>
        <section className="rounded-2xl border border-border bg-surface p-6">
          <h2 className="text-lg font-semibold">Problem statement</h2>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            Public AQI indices are population-wide averages. They say nothing about a 22-year-old with moderate
            persistent asthma and a dust-mite allergy, and they report the present rather than the next 24 hours — which
            is exactly the window in which an attack can be avoided.
          </p>
        </section>
      </div>

      <h2 className="mt-14 text-2xl font-bold">Technologies used</h2>
      <div className="mt-5 flex flex-wrap gap-2">
        {tech.map((t) => (
          <span key={t} className="rounded-full border border-border bg-surface px-4 py-2 text-sm font-medium">
            {t}
          </span>
        ))}
      </div>

      <h2 className="mt-14 text-2xl font-bold">Roadmap</h2>
      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        {roadmap.map((r) => (
          <div key={r.title} className="rounded-2xl border border-border bg-surface p-5 transition-colors hover:border-primary/40">
            <r.icon className="h-5 w-5 text-primary" />
            <h3 className="mt-4 font-semibold">{r.title}</h3>
            <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{r.body}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
