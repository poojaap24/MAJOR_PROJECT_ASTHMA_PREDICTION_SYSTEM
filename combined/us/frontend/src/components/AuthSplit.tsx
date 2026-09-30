import { useState, type ChangeEvent, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { Eye, EyeOff } from "lucide-react";
import { SkyBackground } from "@/components/SkyBackground";

export function AuthField({
  label,
  type,
  placeholder,
  name,
  value,
  onChange,
  autoComplete,
  hint,
}: {
  label: string;
  type: string;
  placeholder: string;
  name: string;
  value: string;
  onChange: (e: ChangeEvent<HTMLInputElement>) => void;
  autoComplete?: string;
  hint?: string;
}) {
  const isPassword = type === "password";
  const [shown, setShown] = useState(false);

  return (
    <label className="block">
      <span className="text-sm font-medium">{label}</span>
      <div className="relative mt-1.5">
        <input
          type={isPassword && shown ? "text" : type}
          name={name}
          value={value}
          onChange={onChange}
          autoComplete={autoComplete}
          placeholder={placeholder}
          required
          className={`w-full rounded-xl border border-input bg-surface px-4 py-3 text-sm outline-none transition-shadow placeholder:text-muted-foreground focus:ring-2 focus:ring-ring/40 ${
            isPassword ? "pr-11" : ""
          }`}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShown((s) => !s)}
            aria-label={shown ? "Hide password" : "Show password"}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
          >
            {shown ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        )}
      </div>
      {hint && <span className="mt-1.5 block text-xs text-muted-foreground">{hint}</span>}
    </label>
  );
}

export function AuthSplit({
  headline,
  tagline,
  title,
  subtitle,
  submitLabel,
  submittingLabel,
  submitting = false,
  error = null,
  onSubmit,
  children,
  footer,
}: {
  headline: string;
  tagline: string;
  title: string;
  subtitle: string;
  submitLabel: string;
  submittingLabel: string;
  submitting?: boolean;
  error?: string | null;
  onSubmit: () => void | Promise<void>;
  children: ReactNode;
  footer: ReactNode;
}) {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="relative isolate flex min-h-[38vh] flex-col justify-between overflow-hidden p-10">
        <SkyBackground tier="safe" />
        <Link to="/" className="relative z-10 font-display text-xl font-bold text-white">
          BreatheSafe
        </Link>
        <div className="relative z-10 max-w-md">
          <h1 className="text-4xl font-bold leading-tight text-white">{headline}</h1>
          <p className="mt-4 text-white/85">{tagline}</p>
        </div>
      </div>

      <div className="flex items-center justify-center bg-background px-6 py-16">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!submitting) void onSubmit();
          }}
          className="enter-up w-full max-w-md rounded-3xl border border-border bg-surface p-8 shadow-card"
        >
          <h2 className="text-2xl font-bold">{title}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>

          {error && (
            <div
              role="alert"
              className="mt-5 rounded-xl border border-severe/30 bg-severe-soft px-4 py-3 text-sm font-medium text-severe"
            >
              {error}
            </div>
          )}

          <div className="mt-7 space-y-4">{children}</div>
          <button
            type="submit"
            disabled={submitting}
            className="mt-7 w-full rounded-xl bg-sunset py-3.5 font-semibold text-primary-foreground transition-transform hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-70 disabled:hover:translate-y-0"
          >
            {submitting ? submittingLabel : submitLabel}
          </button>
          <p className="mt-6 text-center text-sm text-muted-foreground">{footer}</p>
        </form>
      </div>
    </div>
  );
}
