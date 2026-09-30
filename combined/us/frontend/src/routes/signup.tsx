import { useEffect, useState, type ChangeEvent } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { AuthSplit, AuthField } from "@/components/AuthSplit";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/signup")({
  head: () => ({
    meta: [
      { title: "Create account — BreatheSafe" },
      { name: "description", content: "Create a BreatheSafe account and get asthma risk predictions built around your health profile." },
      { property: "og:title", content: "Create account — BreatheSafe" },
      { property: "og:description", content: "Start tracking the air you breathe with personalized asthma risk scores." },
    ],
  }),
  component: SignupPage,
});

// Mirrors the backend rules in backend/auth/middleware/validators.js so people get
// instant feedback; the server still enforces them.
function passwordProblem(pw: string): string | null {
  if (pw.length < 8) return "Password must be at least 8 characters.";
  if (!/[A-Z]/.test(pw)) return "Password must contain an uppercase letter.";
  if (!/[a-z]/.test(pw)) return "Password must contain a lowercase letter.";
  if (!/[0-9]/.test(pw)) return "Password must contain a number.";
  return null;
}

function SignupPage() {
  const navigate = useNavigate();
  const { user, loading, register } = useAuth();
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && user) navigate({ to: "/dashboard", replace: true });
  }, [loading, user, navigate]);

  function handleChange(e: ChangeEvent<HTMLInputElement>) {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  }

  async function handleSubmit() {
    setError(null);
    const problem = passwordProblem(form.password);
    if (problem) {
      setError(problem);
      return;
    }
    setSubmitting(true);
    try {
      await register({ name: form.name.trim(), email: form.email.trim(), password: form.password });
      navigate({ to: "/dashboard", replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthSplit
      headline="Air changes hourly. So should your plan."
      tagline="Tell us about your asthma once, and every prediction after that is weighted for you."
      title="Create account"
      subtitle="Takes about a minute."
      submitLabel="Create account"
      submittingLabel="Creating account…"
      submitting={submitting}
      error={error}
      onSubmit={handleSubmit}
      footer={
        <>
          Already registered?{" "}
          <Link to="/login" className="font-semibold text-primary hover:underline">
            Sign in
          </Link>
        </>
      }
    >
      <AuthField
        label="Full name"
        type="text"
        name="name"
        autoComplete="name"
        placeholder="Sangeetha R"
        value={form.name}
        onChange={handleChange}
      />
      <AuthField
        label="Email"
        type="email"
        name="email"
        autoComplete="email"
        placeholder="you@example.com"
        value={form.email}
        onChange={handleChange}
      />
      <AuthField
        label="Password"
        type="password"
        name="password"
        autoComplete="new-password"
        placeholder="At least 8 characters"
        hint="Use an uppercase letter, a lowercase letter and a number."
        value={form.password}
        onChange={handleChange}
      />
    </AuthSplit>
  );
}
