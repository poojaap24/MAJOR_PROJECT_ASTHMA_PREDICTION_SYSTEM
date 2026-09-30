import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { api } from "@/lib/api";
import { pipelineSteps } from "@/lib/breathesafe";
import DataFlowDiagram from "@/components/DataFlowDiagram";
import TrainingDataMap from "@/components/TrainingDataMap";
import DataStreamFeed from "@/components/DataStreamFeed";

export const Route = createFileRoute("/_shell/how-ai-works")({
  head: () => ({
    meta: [
      { title: "How the AI Works — BreatheSafe" },
      { name: "description", content: "The six-stage pipeline from OpenWeather data to a personalized asthma risk score, with model performance numbers." },
      { property: "og:title", content: "How the AI Works — BreatheSafe" },
      { property: "og:description", content: "CNN-LSTM forecasting plus rule-based personalized risk prediction, explained end to end." },
    ],
  }),
  component: HowAiWorks,
});

type SplitMetrics = { MAE?: number; RMSE?: number; R2?: number };
type Metrics = { same_city_test?: SplitMetrics; unseen_city_test?: SplitMetrics };

function fmt(v: number | undefined, digits = 2) {
  return typeof v === "number" ? v.toFixed(digits) : "—";
}

function MetricCard({ title, note, m }: { title: string; note: string; m?: SplitMetrics | undefined }) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-6">
      <h3 className="font-semibold">{title}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{note}</p>
      <div className="mt-5 grid grid-cols-3 gap-4">
        {[
          ["MAE", fmt(m?.MAE)],
          ["RMSE", fmt(m?.RMSE)],
          ["R²", fmt(m?.R2, 3)],
        ].map(([k, v]) => (
          <div key={k}>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">{k}</p>
            <p className="mt-1 font-display text-2xl font-bold">{v}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function HowAiWorks() {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    // Live from GET /api/model-metrics (reads backend/forecast_metrics.json,
    // which train_forecast_model.py writes after every training run).
    api
      .modelMetrics()
      .then((m) => setMetrics(m as Metrics))
      .catch(() => setFailed(true));
  }, []);

  return (
    <div className="mx-auto max-w-4xl px-6 py-12">
      <div className="enter-up">
        <h1 className="text-3xl font-bold">How the AI works</h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          From a raw API response to advice on your screen, in six stages.
        </p>
      </div>

      <ol className="mt-10 space-y-4">
        {pipelineSteps.map((s, i) => (
          <li key={s.title} className="flex gap-5 rounded-2xl border border-border bg-surface p-6">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-sunset font-display font-bold text-primary-foreground">
              {i + 1}
            </span>
            <div>
              <h2 className="text-lg font-semibold">{s.title}</h2>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{s.body}</p>
            </div>
          </li>
        ))}
      </ol>

      <h2 className="mt-16 text-2xl font-bold">Architecture</h2>
      <p className="mt-2 text-sm text-muted-foreground">How a single prediction flows through the system, end to end.</p>
      <div className="mt-6">
        <DataFlowDiagram />
      </div>

      <h2 className="mt-16 text-2xl font-bold">Where the training data comes from</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        The forecasting model was trained on real government air-quality station data, not synthetic numbers.
      </p>
      <div className="mt-6 grid gap-5 md:grid-cols-2">
        <TrainingDataMap />
        <DataStreamFeed />
      </div>

      <h2 className="mt-16 text-2xl font-bold">How the forecast is calculated</h2>
      <div className="mt-4 rounded-2xl border border-border bg-surface p-6">
        <p className="text-sm leading-relaxed text-muted-foreground">
          The CNN-LSTM model does not predict the next PM2.5 value directly. It predicts the <strong className="text-foreground">change</strong> in
          PM2.5 from the latest reading. That change is then added to the latest PM2.5 reading to get the final predicted PM2.5.
          Pollution moves gradually from one reading to the next, so predicting the change is an easier task than predicting the
          exact value.
        </p>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl bg-muted/50 p-4 text-sm">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Before</p>
            <p className="mt-1 font-medium">50 → model predicts 55 directly</p>
          </div>
          <div className="rounded-xl bg-muted/50 p-4 text-sm">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Now</p>
            <p className="mt-1 font-medium">50 → model predicts +5 → 50 + 5 = 55</p>
          </div>
        </div>
        <p className="mt-4 text-sm font-medium">Predicted PM2.5 = latest PM2.5 reading + predicted change</p>
      </div>

      <h2 className="mt-16 text-2xl font-bold">Model performance</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Live values from the most recent training run. MAE and RMSE are in µg/m³ of PM2.5.
      </p>

      {failed ? (
        <p className="mt-5 rounded-2xl border border-border bg-surface p-6 text-sm text-muted-foreground">
          Couldn't load the model metrics. Make sure the backend is running and <code>forecast_metrics.json</code> exists.
        </p>
      ) : (
        <div className="mt-5 grid gap-5 sm:grid-cols-2">
          <MetricCard title="Same-city test set" note="Held-out hours from cities in training" m={metrics?.same_city_test} />
          <MetricCard title="Unseen-city test set" note="Entire cities the model never saw" m={metrics?.unseen_city_test} />
        </div>
      )}
      <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
        The unseen-city test is a stricter generalisation check: the model predicts cities it never trained on.
      </p>
    </div>
  );
}