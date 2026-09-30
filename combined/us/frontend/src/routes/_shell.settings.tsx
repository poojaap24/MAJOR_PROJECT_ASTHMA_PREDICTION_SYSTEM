import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { ShieldCheck } from "lucide-react";
import { getUserProfile, saveUserProfile } from "@/lib/userProfile";

export const Route = createFileRoute("/_shell/settings")({
  head: () => ({
    meta: [
      { title: "Settings — BreatheSafe" },
      { name: "description", content: "Update the health profile that personalizes every asthma risk prediction." },
      { property: "og:title", content: "Settings — BreatheSafe" },
      { property: "og:description", content: "Manage your asthma severity and allergy status." },
    ],
  }),
  component: SettingsPage,
});

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-sm font-medium">{label}</span>
      <div className="mt-1.5">{children}</div>
    </label>
  );
}

const inputClass =
  "w-full rounded-xl border border-input bg-surface px-4 py-3 text-sm outline-none transition-shadow focus:ring-2 focus:ring-ring/40";

function SettingsPage() {
  const stored = getUserProfile();
  const [age, setAge] = useState(stored.age);
  const [severity, setSeverity] = useState(stored.severity);
  const [allergy, setAllergy] = useState(stored.allergy);
  const [smoker, setSmoker] = useState(stored.smoker);
  const [condition, setCondition] = useState(stored.condition);
  const [outdoorExposure, setOutdoorExposure] = useState(stored.outdoorExposure);
  const [saved, setSaved] = useState(false);

  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <div className="enter-up">
        <h1 className="text-3xl font-bold">Your health profile</h1>
        <p className="mt-2 text-muted-foreground">
          These details weight every prediction — this is exactly the payload sent to{" "}
          <code className="rounded bg-secondary px-1.5 py-0.5 text-xs">POST /api/predict-risk</code>.
        </p>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          saveUserProfile({ age, severity, allergy, smoker, condition, outdoorExposure });
          setSaved(true);
        }}
        className="mt-8 space-y-5 rounded-3xl border border-border bg-surface p-7 shadow-card"
      >
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Age">
            <input
              className={inputClass}
              type="number"
              min={0}
              max={120}
              value={age}
              onChange={(e) => setAge(Number(e.target.value))}
            />
          </Field>
          <Field label="Asthma severity">
            <select
              className={inputClass}
              value={severity}
              onChange={(e) => setSeverity(e.target.value as typeof severity)}
            >
              <option value="mild">Mild</option>
              <option value="moderate">Moderate</option>
              <option value="severe">Severe</option>
            </select>
          </Field>
        </div>
        <Field label="Known allergies">
          <div className="flex items-center gap-3">
            <input
              id="allergy"
              type="checkbox"
              className="h-4 w-4 rounded border-input"
              checked={allergy}
              onChange={(e) => setAllergy(e.target.checked)}
            />
            <label htmlFor="allergy" className="text-sm text-muted-foreground">
              I have known allergies (dust, pollen, fragrances, etc.)
            </label>
          </div>
        </Field>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Existing condition">
            <select
              className={inputClass}
              value={condition}
              onChange={(e) => setCondition(e.target.value as typeof condition)}
            >
              <option value="none">None</option>
              <option value="copd">COPD</option>
              <option value="bronchitis">Chronic bronchitis</option>
              <option value="heart">Heart condition</option>
            </select>
          </Field>
          <Field label="Smoking status">
            <div className="flex items-center gap-3 pt-3.5">
              <input
                id="smoker"
                type="checkbox"
                className="h-4 w-4 rounded border-input"
                checked={smoker}
                onChange={(e) => setSmoker(e.target.checked)}
              />
              <label htmlFor="smoker" className="text-sm text-muted-foreground">
                I currently smoke
              </label>
            </div>
          </Field>
        </div>

        <Field label="Time spent outdoors">
          <div className="flex items-center gap-3">
            <input
              id="outdoor"
              type="checkbox"
              className="h-4 w-4 rounded border-input"
              checked={outdoorExposure}
              onChange={(e) => setOutdoorExposure(e.target.checked)}
            />
            <label htmlFor="outdoor" className="text-sm text-muted-foreground">
              I regularly spend long hours outdoors (commute, outdoor job, sports, etc.)
            </label>
          </div>
        </Field>

        <div className="flex items-center gap-3 rounded-xl bg-secondary/70 p-4 text-sm text-muted-foreground">
          <ShieldCheck className="h-5 w-5 shrink-0 text-primary" />
          Stored only in this browser and used to weight the risk model. Never sent anywhere except the prediction
          request itself.
        </div>

        <div className="flex items-center gap-4">
          <button
            type="submit"
            className="rounded-xl bg-sunset px-6 py-3 font-semibold text-primary-foreground transition-transform hover:-translate-y-0.5"
          >
            Save profile
          </button>
          {saved && <span className="text-sm font-medium text-safe">Profile saved.</span>}
        </div>
      </form>
    </div>
  );
}