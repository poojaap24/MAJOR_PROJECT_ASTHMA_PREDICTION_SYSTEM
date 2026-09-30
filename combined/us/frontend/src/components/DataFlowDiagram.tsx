import type { LucideIcon } from "lucide-react";
import { CloudSun, Layers, Cpu, ListChecks, HeartPulse, LayoutDashboard } from "lucide-react";

type Stage = { icon: LucideIcon; title: string; body: string };

const stages: Stage[] = [
  {
    icon: CloudSun,
    title: "OpenWeather API",
    body: "Live pollutant and weather readings are fetched for your searched or current location.",
  },
  {
    icon: Layers,
    title: "Reading Buffer",
    body: "Each check adds one reading to a rolling window until 16 readings are collected.",
  },
  {
    icon: Cpu,
    title: "CNN-LSTM Forecast",
    body: "The model predicts the change in PM2.5 from those 16 readings and adds it to the latest reading.",
  },
  {
    icon: ListChecks,
    title: "Rule-Based Classifier",
    body: "The forecasted PM2.5 is compared against fixed thresholds to get an environmental risk level.",
  },
  {
    icon: HeartPulse,
    title: "Personalized Scoring",
    body: "Your age, severity, allergy, smoking, condition, and outdoor exposure adjust the risk to you specifically.",
  },
  {
    icon: LayoutDashboard,
    title: "Dashboard & Advice",
    body: "The final risk level and tailored precautions are shown on your Predict page and saved to your history.",
  },
];

export default function DataFlowDiagram() {
  return (
    <div className="mx-auto flex max-w-xl flex-col">
      {stages.map((stage, i) => {
        const Icon = stage.icon;
        const isLast = i === stages.length - 1;
        return (
          <div key={stage.title}>
            <div className="flex items-start gap-4 rounded-2xl border border-border bg-surface p-5">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-sunset text-primary-foreground">
                <Icon className="h-5 w-5" />
              </span>
              <div>
                <p className="font-semibold">{stage.title}</p>
                <p className="mt-1 text-sm text-muted-foreground">{stage.body}</p>
              </div>
            </div>

            {!isLast && (
              <div className="relative mx-auto h-8 w-px bg-border">
                <span className="animate-flow-dot absolute left-1/2 h-2 w-2 -translate-x-1/2 rounded-full bg-sunset shadow-[0_0_8px_var(--primary)]" />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}