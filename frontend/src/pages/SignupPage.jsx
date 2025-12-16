import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function SignupPage() {
  const { signup, user, hasAccounts } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (user) {
      navigate("/app", { replace: true });
    }
  }, [navigate, user]);

  const handleSubmit = (e) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      signup(form);
      navigate("/app");
    } catch (err) {
      setError(err.message || "Unable to sign up right now.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 text-slate-50 flex items-center">
      <div className="max-w-5xl mx-auto px-6 py-12 w-full grid lg:grid-cols-[1.1fr_0.9fr] gap-10 items-center">
        <div className="space-y-4">
          <Link to="/" className="text-sm text-teal-200 hover:text-teal-100">
            ← Back to site
          </Link>
          <h1 className="text-4xl font-bold leading-tight text-slate-50">
            Build personalized mockups, ready to send, in minutes.
          </h1>
          <p className="text-lg text-slate-200/80 max-w-2xl">
            Your account saves templates, placements, and mappings so you can rerun batches any time. Start free—no payment required.
          </p>
          <div className="flex flex-wrap gap-3 text-sm text-slate-300">
            <span className="px-3 py-2 rounded-lg bg-slate-800/70 border border-white/10">Unlimited templates</span>
            <span className="px-3 py-2 rounded-lg bg-slate-800/70 border border-white/10">3 free batch runs</span>
            <span className="px-3 py-2 rounded-lg bg-slate-800/70 border border-white/10">Cloud exports</span>
          </div>
        </div>

        <div className="bg-slate-900/70 border border-white/10 rounded-2xl p-8 shadow-xl shadow-slate-900/40">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-semibold">Sign up</h2>
            {hasAccounts && <span className="text-xs text-slate-400">Already tried? <Link to="/login" className="text-teal-200 hover:text-teal-100">Log in</Link></span>}
          </div>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <label className="block text-sm">
              <span className="text-slate-200">Name</span>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                className="mt-1 w-full rounded-lg border border-white/10 bg-slate-950/70 px-3 py-2 text-slate-50 focus:outline-none focus:ring-2 focus:ring-teal-400"
                placeholder="Your team name"
              />
            </label>
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
                placeholder="At least 6 characters"
                required
              />
            </label>
            {error && <p className="text-sm text-red-300 bg-red-500/10 border border-red-500/40 rounded-lg px-3 py-2">{error}</p>}
            <button
              type="submit"
              className="w-full py-3 rounded-lg bg-teal-400 text-slate-900 font-semibold hover:bg-teal-300 transition disabled:opacity-60 disabled:cursor-not-allowed"
              disabled={submitting}
            >
              {submitting ? "Creating your account..." : "Create account"}
            </button>
          </form>
          <p className="text-sm text-slate-400 mt-4">
            Already have access?{" "}
            <Link to="/login" className="text-teal-200 hover:text-teal-100">
              Log in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
