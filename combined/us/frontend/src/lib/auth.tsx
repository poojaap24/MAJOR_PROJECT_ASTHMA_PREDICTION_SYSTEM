// Real login/signup client for the Express auth API (backend/auth/*, mounted at /api/auth).
//
// How the session works:
//  - Login/signup returns a short-lived ACCESS token in the JSON body. It is kept in
//    memory only (never localStorage) so an XSS bug can't steal a long-lived credential.
//  - A long-lived REFRESH token is set by the server as an httpOnly cookie. On page load
//    we call /refresh with that cookie to silently restore the session.
//  - Logout revokes the refresh token in the auth database and clears the cookie.

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

const BASE_URL: string = import.meta.env["VITE_API_BASE_URL"] || "http://localhost:5000";
const AUTH_URL = `${BASE_URL}/api/auth`;

export type AuthUser = {
  id: number;
  name: string;
  email: string;
  role: string;
  is_verified?: number;
  created_at?: string;
};

// In-memory access token. Exported so future protected API calls can attach it.
let accessToken: string | null = null;
export function getAccessToken(): string | null {
  return accessToken;
}

/** Turns the backend's `{ error }` / `{ errors: [{ msg }] }` shapes into one readable string. */
function messageFrom(body: any, status: number): string {
  if (Array.isArray(body?.errors) && body.errors.length) {
    return body.errors.map((e: { msg?: string }) => e.msg).filter(Boolean).join(" ");
  }
  return body?.error || body?.message || `Request failed (${status})`;
}

async function authRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body) headers.set("Content-Type", "application/json");
  if (accessToken) headers.set("Authorization", `Bearer ${accessToken}`);

  let res: Response;
  try {
    // credentials: "include" is what lets the httpOnly refresh cookie travel cross-origin
    res = await fetch(`${AUTH_URL}${path}`, { ...init, headers, credentials: "include" });
  } catch {
    throw new Error(`Can't reach the server at ${BASE_URL}. Is the backend running?`);
  }

  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(messageFrom(body, res.status));
  return body as T;
}

// The first refresh rotates the cookie, so two concurrent calls (e.g. React StrictMode's
// double effect in dev) would make the second one fail and log the user out. Share one promise.
let restorePromise: Promise<AuthUser | null> | null = null;
function restoreSession(): Promise<AuthUser | null> {
  if (!restorePromise) {
    restorePromise = (async () => {
      try {
        const refreshed = await authRequest<{ accessToken: string }>("/refresh", { method: "POST" });
        accessToken = refreshed.accessToken;
        const me = await authRequest<{ user: AuthUser }>("/me");
        return me.user;
      } catch {
        accessToken = null;
        return null;
      }
    })().finally(() => {
      restorePromise = null;
    });
  }
  return restorePromise;
}

type AuthContextValue = {
  user: AuthUser | null;
  /** true until the first silent session check has finished */
  loading: boolean;
  login: (input: { email: string; password: string }) => Promise<AuthUser>;
  register: (input: { name: string; email: string; password: string }) => Promise<AuthUser>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    restoreSession().then((restored) => {
      if (cancelled) return;
      setUser(restored);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback<AuthContextValue["login"]>(async (input) => {
    const data = await authRequest<{ user: AuthUser; accessToken: string }>("/login", {
      method: "POST",
      body: JSON.stringify(input),
    });
    accessToken = data.accessToken;
    setUser(data.user);
    return data.user;
  }, []);

  const register = useCallback<AuthContextValue["register"]>(async (input) => {
    const data = await authRequest<{ user: AuthUser; accessToken: string }>("/register", {
      method: "POST",
      body: JSON.stringify(input),
    });
    accessToken = data.accessToken;
    setUser(data.user);
    return data.user;
  }, []);

  const logout = useCallback<AuthContextValue["logout"]>(async () => {
    try {
      await authRequest("/logout", { method: "POST" });
    } catch {
      // Even if the server is unreachable, drop the local session.
    } finally {
      accessToken = null;
      setUser(null);
    }
  }, []);

  const value = useMemo(
    () => ({ user, loading, login, register, logout }),
    [user, loading, login, register, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within <AuthProvider>");
  return ctx;
}
