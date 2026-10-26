import { EarningsPage, PortfolioPage } from "./finance";
import { useEffect, useState, type FormEvent } from "react";
import { NavLink, Navigate, Route, Routes } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowRight,
  CalendarCheck2,
  Layers2,
  Settings2,
  Sprout,
  Wallet,
  PanelsTopLeft,
} from "lucide-react";
import { api, SESSION_KEY } from "./api";
import { ErrorNotice, Field } from "./ui";
import { TodayPage, AllGigsPage, GigPage } from "./gigs";
const nav = [
  { to: "/", label: "Today", icon: CalendarCheck2 },
  { to: "/gigs", label: "All gigs", icon: Layers2 },
  { to: "/earnings", label: "Earnings", icon: Wallet },
  { to: "/portfolio", label: "Portfolio", icon: PanelsTopLeft },
];
export function App() {
  const [session, setSession] = useState(() =>
    localStorage.getItem(SESSION_KEY),
  );
  const cache = useQueryClient();
  useEffect(() => {
    const sync = () => {
      setSession(localStorage.getItem(SESSION_KEY));
      cache.clear();
    };
    window.addEventListener("session-changed", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("session-changed", sync);
      window.removeEventListener("storage", sync);
    };
  }, [cache]);
  if (!session)
    return (
      <Login
        onLogin={(token) => {
          localStorage.setItem(SESSION_KEY, token);
          cache.clear();
          setSession(token);
        }}
      />
    );
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <NavLink to="/" className="brand">
          <span className="brand-icon">
            <Sprout />
          </span>
          <span>
            Gig by gig<small>A little progress, every day.</small>
          </span>
        </NavLink>
        <div className="sidebar-label">YOUR WORKSPACE</div>
        <nav>
          {nav.map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to} end={to === "/"}>
              <Icon size={20} />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-footer">
          <p>
            One good gig.
            <br />
            One clear next step.
          </p>
          <NavLink to="/settings">
            <Settings2 size={18} />
            Settings
          </NavLink>
        </div>
      </aside>
      <main>
        <Routes>
          <Route path="/" element={<TodayPage />} />
          <Route path="/gigs" element={<AllGigsPage />} />
          <Route path="/earnings" element={<EarningsPage />} />
          <Route path="/portfolio" element={<PortfolioPage />} />
          <Route path="/gigs/:id" element={<GigPage />} />
          <Route
            path="/settings"
            element={
              <SettingsPage
                onLogout={() => {
                  localStorage.removeItem(SESSION_KEY);
                  cache.clear();
                  setSession(null);
                }}
              />
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <nav className="mobile-nav">
        {nav.map(({ to, label, icon: Icon }) => (
          <NavLink key={to} to={to} end={to === "/"}>
            <Icon size={20} />
            <span>{label}</span>
          </NavLink>
        ))}
        <NavLink to="/settings">
          <Settings2 size={20} />
          <span>Settings</span>
        </NavLink>
      </nav>
    </div>
  );
}
function Login({ onLogin }: { onLogin: (token: string) => void }) {
  const login = useMutation({
    mutationFn: (password: string) =>
      api<{ token: string }>("/auth/login", {
        method: "POST",
        body: { password },
      }),
    onSuccess: (data) => onLogin(data.token),
  });
  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    login.mutate(new FormData(e.currentTarget).get("password") as string);
  }
  return (
    <div className="login-screen">
      <div className="login-story">
        <span className="eyebrow">GIG BY GIG</span>
        <Sprout className="login-sprout" />
        <h1>
          Good work starts
          <br />
          with one small step.
        </h1>
        <p>
          Your gigs, your approach, your next move.
          <br />
          All in one calm place.
        </p>
        <span className="story-foot">Built for the way you work, escnaor.</span>
      </div>
      <div className="login-form">
        <span className="brand-icon">
          <Sprout />
        </span>
        <span className="eyebrow">YOUR WORKSPACE</span>
        <h1>Welcome back.</h1>
        <p>Open your workspace. Take the next step.</p>
        <form onSubmit={submit}>
          <Field label="Password">
            <input
              autoFocus
              required
              type="password"
              name="password"
              autoComplete="current-password"
              placeholder="Enter your password"
            />
          </Field>
          <ErrorNotice error={login.error} />
          <button className="button" disabled={login.isPending}>
            {login.isPending ? "Opening…" : "Log in"}
            <ArrowRight size={18} />
          </button>
        </form>
        <small>Just you. Just your work.</small>
      </div>
    </div>
  );
}
function SettingsPage({ onLogout }: { onLogout: () => void }) {
  const change = useMutation({
    mutationFn: (body: unknown) =>
      api("/auth/change-password", { method: "POST", body }),
  });
  const logout = useMutation({
    mutationFn: () => api("/auth/logout", { method: "POST" }),
    onSuccess: onLogout,
  });
  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const d = new FormData(form);
    change.mutate(
      { current_password: d.get("current"), password: d.get("password") },
      { onSuccess: () => form.reset() },
    );
  }
  return (
    <div className="page narrow">
      <PageTitle
        eyebrow="YOUR WORKSPACE"
        title="Settings"
        subtitle="Keep your workspace yours."
      />
      <section className="panel">
        <h2>Change password</h2>
        <form onSubmit={submit}>
          <Field label="Current password">
            <input
              required
              type="password"
              name="current"
              autoComplete="current-password"
            />
          </Field>
          <Field label="New password">
            <input
              required
              minLength={8}
              type="password"
              name="password"
              autoComplete="new-password"
            />
          </Field>
          <p className="muted">
            At least 8 characters. Changing it logs out your other devices.
          </p>
          <ErrorNotice error={change.error} />
          {change.isSuccess && (
            <p role="status" className="success">
              Password changed.
            </p>
          )}
          <button className="button" disabled={change.isPending}>
            Change password
          </button>
        </form>
      </section>
      <section className="panel">
        <h2>Done for now?</h2>
        <ErrorNotice error={logout.error} />
        <button
          className="button secondary"
          onClick={() => logout.mutate()}
          disabled={logout.isPending}
        >
          Log out
        </button>
      </section>
    </div>
  );
}
export function PageTitle({
  eyebrow,
  title,
  subtitle,
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
}) {
  return (
    <header className="page-title">
      <span className="eyebrow">{eyebrow}</span>
      <h1>{title}</h1>
      <p>{subtitle}</p>
    </header>
  );
}
