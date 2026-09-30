import { createFileRoute } from "@tanstack/react-router";
import { Leaf, Fan, Droplet, Moon, Timer, HelpCircle } from "lucide-react";
import { RISK_META, type RiskTier } from "@/lib/breathesafe";

export const Route = createFileRoute("/_shell/health-tips")({
  head: () => ({
    meta: [
      { title: "Health Tips — BreatheSafe" },
      { name: "description", content: "What to do at every AQI band, plus daily habits that protect asthmatic lungs." },
      { property: "og:title", content: "Health Tips — BreatheSafe" },
      { property: "og:description", content: "Practical asthma guidance for safe, moderate, high and severe air days." },
    ],
  }),
  component: HealthTips,
});

const tiers: Array<{ tier: RiskTier; range: string; tips: string[] }> = [
  {
    tier: "safe",
    range: "AQI 0-50",
    tips: ["Exercise outdoors freely", "Air out your home", "Great day for a long walk or run", "No mask needed"],
  },
  {
    tier: "moderate",
    range: "AQI 51-100",
    tips: ["Cap hard outdoor effort at 30 minutes", "Keep your reliever inhaler with you", "Avoid busy roads at rush hour", "Watch for early tightness"],
  },
  {
    tier: "high",
    range: "AQI 101-150",
    tips: ["Move workouts indoors", "Wear a well-fitted N95 outside", "Run a purifier in your bedroom", "Pre-medicate as per your action plan"],
  },
  {
    tier: "severe",
    range: "AQI 151+",
    tips: ["Stay indoors wherever possible", "Seal windows and doors", "Keep emergency contacts at hand", "Seek care early if symptoms escalate"],
  },
];

const habits = [
  { icon: Leaf, title: "Indoor plants", body: "Areca palm and snake plant help with indoor VOCs — no substitute for ventilation." },
  { icon: Fan, title: "Air purifier", body: "A true-HEPA unit sized to your bedroom cuts overnight PM2.5 exposure sharply." },
  { icon: Droplet, title: "Water intake", body: "Hydration keeps airway mucus thin and easier to clear on polluted days." },
  { icon: Moon, title: "Sleep", body: "Poor sleep raises airway reactivity. Keep the bedroom cool, closed and filtered." },
  { icon: Timer, title: "Exercise timing", body: "Pollution dips mid-morning in most Indian cities. Train then, not at dusk." },
  { icon: HelpCircle, title: "Pollution myths", body: "Rain doesn't always clean the air, and cloth masks do very little for PM2.5." },
];

function HealthTips() {
  return (
    <div className="mx-auto max-w-6xl px-6 py-12">
      <div className="enter-up">
        <h1 className="text-3xl font-bold">Health tips by air quality band</h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          The same advice doesn't work at AQI 40 and AQI 220. Here's what changes as the air gets worse.
        </p>
      </div>

      <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {tiers.map(({ tier, range, tips }) => {
          const meta = RISK_META[tier];
          return (
            <article key={tier} className="overflow-hidden rounded-2xl border border-border bg-surface">
              <div className={`h-1.5 w-full ${meta.dot}`} />
              <div className="p-5">
                <h2 className={`text-lg font-semibold ${meta.text}`}>{meta.label} air</h2>
                <p className="text-xs text-muted-foreground">{range}</p>
                <ul className="mt-4 space-y-2.5">
                  {tips.map((t) => (
                    <li key={t} className="flex gap-2.5 text-sm leading-relaxed text-muted-foreground">
                      <span className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${meta.dot}`} />
                      {t}
                    </li>
                  ))}
                </ul>
              </div>
            </article>
          );
        })}
      </div>

      <h2 className="mt-16 text-2xl font-bold">Healthy habits</h2>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {habits.map((h) => (
          <div key={h.title} className="rounded-2xl border border-border bg-surface p-5 transition-colors hover:border-primary/40">
            <h.icon className="h-5 w-5 text-primary" />
            <h3 className="mt-4 font-semibold">{h.title}</h3>
            <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{h.body}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
