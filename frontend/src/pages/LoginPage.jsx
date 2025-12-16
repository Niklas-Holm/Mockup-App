import React, { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function LoginPage() {
  const { login, user, hasAccounts } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const redirectTo = useMemo(() => location.state?.from || "/app", [location.state]);
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (user) {
      navigate(redirectTo, { replace: true });
    }
  }, [navigate, redirectTo, user]);

  const handleSubmit = (e) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      login(form);
      navigate(redirectTo);
    } catch (err) {
      setError(err.message || "Unable to log in right now.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-slate-50 flex items-center">
      <div className="max-w-5xl mx-auto px-6 py-12 w-full grid lg:grid-cols-[0.95fr_1.05fr] gap-10 items-center">
        <div className="space-y-4">
          <Link to="/" className="text-sm text-teal-200 hover:text-teal-100">
            ← Back to site
          </Link>
          <p className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-xs uppercase tracking-[0.2em] text-teal-200">
            Welcome back
          </p>
          <h1 className="text-4xl font-bold leading-tight">Pick up where you left off.</h1>
          <p className="text-lg text-slate-200/80 max-w-2xl">
            Access your templates, mappings, and previous batch jobs. Your workspace stays intact between sessions.
          </p>
          <div className="flex flex-wrap gap-3 text-sm text-slate-300">
            <span className="px-3 py-2 rounded-lg bg-slate-800/70 border border-white/10">Secure local storage</span>
            <span className="px-3 py-2 rounded-lg bg-slate-800/70 border border-white/10">Fast resume</span>
          </div>
        </div>

        <div className="bg-slate-900/70 border border-white/10 rounded-2xl p-8 shadow-xl shadow-slate-900/40">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-semibold">Log in</h2>
            {!hasAccounts && (
              <span className="text-xs text-slate-400">
                New here?{" "}
                <Link to="/signup" className="text-teal-200 hover:text-teal-100">
                  Create an account
                </Link>
              </span>
            )}
          </div>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <label className="block text-sm">
              <span className="text-slate-200">Email</span>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
                className="mt-1 w-full rounded-lg border border-white/10 bg-slate-950/70 px-3 py-2 text-slate-50 focus:outline-none focus:ring-2 focus:ring-teal-400"
                placeholder="you@company.com"
                required
              />
            </label>
            <label className="block text-sm">
              <span className="text-slate-200">Password</span>
              <input
                type="password"
                value={form.password}
                onChange={(e) => setForm((prev) => ({ ...prev, password: e.target.value }))}
                className="mt-1 w-full rounded-lg border border-white/10 bg-slate-950/70 px-3 py-2 text-slate-50 focus:outline-none focus:ring-2 focus:ring-teal-400"
                placeholder="Your password"
                required
              />
            </label>
            {error && <p className="text-sm text-red-300 bg-red-500/10 border border-red-500/40 rounded-lg px-3 py-2">{error}</p>}
            <button
              type="submit"
              className="w-full py-3 rounded-lg bg-teal-400 text-slate-900 font-semibold hover:bg-teal-300 transition disabled:opacity-60 disabled:cursor-not-allowed"
              disabled={submitting}
            >
              {submitting ? "Signing you in..." : "Log in"}
            </button>
          </form>
          <p className="text-sm text-slate-400 mt-4">
            Don’t have an account?{" "}
            <Link to="/signup" className="text-teal-200 hover:text-teal-100">
              Create one
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
