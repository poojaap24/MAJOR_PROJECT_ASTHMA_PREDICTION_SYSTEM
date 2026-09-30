import { useEffect, useState, type ChangeEvent } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { AuthSplit, AuthField } from "@/components/AuthSplit";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Sign in — BreatheSafe" },
      { name: "description", content: "Sign in to BreatheSafe to see your live asthma risk score." },
      { property: "og:title", content: "Sign in — BreatheSafe" },
      { property: "og:description", content: "Access your personalized air quality and asthma risk dashboard." },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const { user, loading, login } = useAuth();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Already signed in (e.g. session restored from the refresh cookie)? Skip the form.
  useEffect(() => {
    if (!loading && user) navigate({ to: "/dashboard", replace: true });
  }, [loading, user, navigate]);

  function handleChange(e: ChangeEvent<HTMLInputElement>) {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  }

  async function handleSubmit() {
    setError(null);
    setSubmitting(true);
    try {
      await login({ email: form.email.trim(), password: form.password });
      navigate({ to: "/dashboard", replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthSplit
      headline="Welcome back to cleaner decisions."
      tagline="Your risk score has been updating while you were away. Pick up where the air left off."
      title="Sign in"
      subtitle="Use the email you registered with."
      submitLabel="Sign in"
      submittingLabel="Signing in…"
      submitting={submitting}
      error={error}
      onSubmit={handleSubmit}
      footer={
        <>
          New here?{" "}
          <Link to="/signup" className="font-semibold text-primary hover:underline">
            Create an account
          </Link>
        </>
      }
    >
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
        autoComplete="current-password"
        placeholder="••••••••"
        value={form.password}
        onChange={handleChange}
      />
    </AuthSplit>
  );
}
