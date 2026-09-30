import { useEffect } from "react";
import { createFileRoute, Link, Outlet, useNavigate } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Wind,
  History,
  BarChart3,
  HeartPulse,
  Brain,
  Info,
  Settings,
  Waves,
  LogOut,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import Chatbot from "@/components/Chatbot";

export const Route = createFileRoute("/_shell")({
  component: ShellLayout,
});

const nav = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/predict", label: "Predict Risk", icon: Wind },
  { to: "/history", label: "History", icon: History },
  { to: "/analytics", label: "Analytics", icon: BarChart3 },
  { to: "/health-tips", label: "Health Tips", icon: HeartPulse },
  { to: "/how-ai-works", label: "How AI Works", icon: Brain },
  { to: "/about", label: "About", icon: Info },
  { to: "/settings", label: "Settings", icon: Settings },
] as const;

function ShellLayout() {
  const { user, loading, logout } = useAuth();
  const navigate = useNavigate();

  // Every page under this layout needs a signed-in user.
  useEffect(() => {
    if (!loading && !user) navigate({ to: "/login", replace: true });
  }, [loading, user, navigate]);

  async function handleLogout() {
    await logout();
    navigate({ to: "/login", replace: true });
  }

  // Holding screen while the session is checked (also what SSR renders, so hydration matches).
  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <span
          role="status"
          aria-label="Checking your session"
          className="h-8 w-8 animate-spin rounded-full border-2 border-border border-t-primary"
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-sidebar-border bg-sidebar px-4 py-6 lg:flex">
        <Link to="/" className="mb-8 flex items-center gap-2.5 px-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-sunset">
            <Waves className="h-5 w-5 text-primary-foreground" />
          </span>
          <span className="font-display text-lg font-bold">BreatheSafe</span>
        </Link>

        <nav className="flex flex-1 flex-col gap-1">
          {nav.map(({ to, label, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              className="group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground data-[status=active]:bg-sidebar-accent data-[status=active]:text-sidebar-accent-foreground data-[status=active]:font-semibold"
            >
              <Icon className="h-[18px] w-[18px]" />
              {label}
            </Link>
          ))}
        </nav>

        <div className="rounded-xl border border-border bg-secondary/60 p-4">
          <p className="truncate text-sm font-semibold">{user.name}</p>
          <p className="mt-0.5 truncate text-xs text-muted-foreground">{user.email}</p>
          <button
            type="button"
            onClick={handleLogout}
            className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <LogOut className="h-3.5 w-3.5" />
            Sign out
          </button>
        </div>
      </aside>

      <div className="lg:pl-64">
        <div className="flex gap-1 overflow-x-auto border-b border-border bg-surface px-3 py-2 lg:hidden">
          {nav.map(({ to, label }) => (
            <Link
              key={to}
              to={to}
              className="shrink-0 rounded-full px-3 py-1.5 text-xs font-medium text-muted-foreground data-[status=active]:bg-accent data-[status=active]:text-accent-foreground"
            >
              {label}
            </Link>
          ))}
          <button
            type="button"
            onClick={handleLogout}
            className="ml-auto shrink-0 rounded-full px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
          >
            Sign out
          </button>
        </div>
        <Outlet />
      </div>

      <Chatbot />
    </div>
  );
}
