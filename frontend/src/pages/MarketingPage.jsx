import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const features = [
  { title: "CSV → mockups in minutes", body: "Upload your lead list, map the columns you care about, and generate personalized creative without touching design tools." },
  { title: "Visual placement editor", body: "Drag text and logos directly on the template, tweak sizing, and preview the exact layout before you run a batch." },
  { title: "Cloud-ready output", body: "Export straight to Cloudinary with URLs back in your CSV so sales, ads, or outreach can plug them in immediately." },
];

const steps = [
  "Drop a CSV or paste rows from your CRM.",
  "Map columns to variables like name, logo, or offer.",
  "Adjust placement visually and preview a few rows.",
  "Run the batch and ship links to your team.",
];

const testimonials = [
  {
    quote: "We replaced a week of design grunt work with one upload. Outreach reply rates jumped immediately.",
    name: "Avery Nolan",
    title: "Head of Growth, Outboundly",
  },
  {
    quote: "The visual editor is exactly what our sales team needed—no more back-and-forth with design.",
    name: "Mara Singh",
    title: "Revenue Ops, Northwind",
  },
];

export default function MarketingPage() {
  const [darkMode, setDarkMode] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    const root = document.documentElement;
    if (darkMode) {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
    return () => root.classList.remove("dark");
  }, [darkMode]);

  const heroBg = darkMode
    ? "bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950"
    : "bg-gradient-to-br from-white via-slate-50 to-blue-50";
  const pageBg = darkMode ? "bg-slate-950 text-slate-50" : "bg-slate-50 text-slate-900";
  const navLink = darkMode ? "hover:text-teal-200" : "text-slate-700 hover:text-teal-600";
  const primaryCard = darkMode
    ? "bg-slate-900/80 border border-white/10 shadow-lg shadow-slate-900/30"
    : "bg-white border border-slate-200 shadow-lg shadow-slate-200/50";
  const mutedCard = darkMode
    ? "bg-slate-900/70 border border-white/10 shadow-lg shadow-slate-900/30"
    : "bg-white border border-slate-200 shadow-lg shadow-slate-200/40";
  const accentCta = darkMode
    ? "bg-teal-400 text-slate-900 hover:bg-teal-300"
    : "bg-slate-900 text-white hover:bg-slate-800";
  const outlineCta = darkMode
    ? "border border-white/20 text-slate-100 hover:border-teal-200/60 hover:text-teal-100"
    : "border border-slate-300 text-slate-800 hover:border-teal-500/60 hover:text-teal-700";
  const toggleBtn = darkMode
    ? "border border-white/20 bg-white/10 text-white hover:bg-white/20"
    : "border border-slate-300 bg-white text-slate-800 hover:bg-slate-100";

  const gradientOverlay = useMemo(
    () =>
      darkMode
        ? "radial-gradient(circle at 20% 20%, rgba(56,189,248,0.18), transparent 25%), radial-gradient(circle at 80% 10%, rgba(94,234,212,0.2), transparent 25%), radial-gradient(circle at 60% 80%, rgba(59,130,246,0.15), transparent 20%)"
        : "radial-gradient(circle at 20% 20%, rgba(56,189,248,0.14), transparent 25%), radial-gradient(circle at 80% 10%, rgba(59,130,246,0.15), transparent 25%), radial-gradient(circle at 60% 80%, rgba(20,184,166,0.14), transparent 20%)",
    [darkMode]
  );

  return (
    <div className={`min-h-screen ${pageBg}`}>
      <header className={`relative overflow-hidden ${heroBg}`}>
        <div className="absolute inset-0 opacity-30" style={{ backgroundImage: gradientOverlay }} />
        <div className="max-w-6xl mx-auto px-6 pt-10 pb-16 relative">
          <nav className="flex items-center justify-between">
            <Link to="/" className="text-lg font-semibold tracking-tight">Mockup Studio</Link>
            <div className="hidden sm:flex items-center gap-4 text-sm">
              <a href="#features" className={`${navLink} transition`}>Features</a>
              <a href="#pricing" className={`${navLink} transition`}>Pricing</a>
              <a href="#how" className={`${navLink} transition`}>How it works</a>
            </div>
            <div className="flex items-center gap-3">
              <button
                className={`px-3 py-2 rounded-md text-xs font-semibold transition ${toggleBtn}`}
                onClick={() => setDarkMode((v) => !v)}
              >
                {darkMode ? "Switch to Light" : "Switch to Dark"}
              </button>
              {user ? (
                <Link
                  to="/app"
                  className={`px-4 py-2 rounded-md font-semibold text-sm transition shadow-lg shadow-teal-500/20 ${accentCta}`}
                >
                  Go to app
                </Link>
              ) : (
                <>
                  <Link to="/login" className={`text-sm transition ${navLink}`}>Log in</Link>
                  <Link
                    to="/signup"
                    className={`px-4 py-2 rounded-md font-semibold text-sm transition shadow-lg shadow-teal-500/20 ${accentCta}`}
                  >
                    Start free
                  </Link>
                </>
              )}
            </div>
          </nav>

          <div className="grid lg:grid-cols-2 gap-10 lg:gap-14 items-center mt-12">
            <div className="space-y-6">
              <p className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-xs uppercase tracking-[0.2em] text-teal-200">
                Personalize at scale
              </p>
              <h1
                className={`text-4xl sm:text-5xl font-bold leading-tight ${
                  darkMode ? "text-slate-50" : "text-slate-900"
                }`}
              >
                Turn any CSV into on-brand mockups your team can send today.
              </h1>
              <p className={`text-lg ${darkMode ? "text-slate-200/80" : "text-slate-700"}`}>
                Mockup Studio automates creative for outreach, ads, and partner updates. Drop your data, map variables, and batch generate polished images with URLs ready to ship.
              </p>
              <div className="flex flex-wrap gap-3">
                {user ? (
                  <Link
                    to="/app"
                    className={`px-5 py-3 rounded-lg font-semibold transition shadow-lg shadow-teal-500/25 ${accentCta}`}
                  >
                    Go to app
                  </Link>
                ) : (
                  <>
                    <Link
                      to="/signup"
                      className={`px-5 py-3 rounded-lg font-semibold transition shadow-lg shadow-teal-500/25 ${accentCta}`}
                    >
                      Start free trial
                    </Link>
                    <Link
                      to="/login"
                      className={`px-5 py-3 rounded-lg font-semibold transition ${outlineCta}`}
                    >
                      I already have an account
                    </Link>
                  </>
                )}
              </div>
              <div className={`flex flex-wrap gap-6 text-sm ${darkMode ? "text-slate-300" : "text-slate-700"}`}>
                <span className="flex items-center gap-2">
                  <span className={`h-2 w-2 rounded-full ${darkMode ? "bg-teal-400" : "bg-teal-500"}`} /> No credit card required
                </span>
                <span className="flex items-center gap-2">
                  <span className={`h-2 w-2 rounded-full ${darkMode ? "bg-indigo-400" : "bg-indigo-500"}`} /> Ship-ready exports
                </span>
              </div>
            </div>
            <div className="relative">
              <div className="absolute -inset-6 bg-gradient-to-br from-teal-400/10 via-indigo-500/10 to-transparent blur-3xl" />
              <div className={`relative rounded-2xl p-5 shadow-2xl ${darkMode ? "border border-white/10 bg-white/5 shadow-slate-900/40" : "border border-slate-200 bg-white shadow-slate-300/40"}`}>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <span className={`h-3 w-3 rounded-full ${darkMode ? "bg-red-400" : "bg-red-500"}`} />
                    <span className={`h-3 w-3 rounded-full ${darkMode ? "bg-yellow-400" : "bg-yellow-500"}`} />
                    <span className={`h-3 w-3 rounded-full ${darkMode ? "bg-green-400" : "bg-green-500"}`} />
                  </div>
                  <span className={`text-xs ${darkMode ? "text-slate-300" : "text-slate-500"}`}>Preview · Mockup run</span>
                </div>
                <div className={`rounded-xl overflow-hidden ${darkMode ? "border border-white/10" : "border border-slate-200"}`}>
                  <img
                    src="/static/mockup-template.jpg"
                    alt="Product preview"
                    className="w-full object-cover"
                  />
                </div>
                <div className="mt-4 grid sm:grid-cols-3 gap-3 text-sm">
                  <div className={`p-3 rounded-lg ${darkMode ? "bg-slate-900/60 border border-white/5" : "bg-slate-100 border border-slate-200"}`}>
                    <p className="text-teal-200 font-semibold">Leads processed</p>
                    <p className="text-2xl font-bold mt-1">5,000+</p>
                  </div>
                  <div className={`p-3 rounded-lg ${darkMode ? "bg-slate-900/60 border border-white/5" : "bg-slate-100 border border-slate-200"}`}>
                    <p className="text-teal-200 font-semibold">Avg. setup</p>
                    <p className="text-2xl font-bold mt-1">8 minutes</p>
                  </div>
                  <div className={`p-3 rounded-lg ${darkMode ? "bg-slate-900/60 border border-white/5" : "bg-slate-100 border border-slate-200"}`}>
                    <p className="text-teal-200 font-semibold">Exports</p>
                    <p className="text-2xl font-bold mt-1">Cloud-ready</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-14 space-y-16">
        <section id="features" className="grid md:grid-cols-3 gap-6">
          {features.map((feature) => (
            <div key={feature.title} className={`p-6 rounded-2xl ${primaryCard}`}>
              <p className={`text-xs uppercase tracking-[0.2em] mb-2 ${darkMode ? "text-teal-200" : "text-teal-700"}`}>Feature</p>
              <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
              <p className={`${darkMode ? "text-slate-300" : "text-slate-700"}`}>{feature.body}</p>
            </div>
          ))}
        </section>

        <section id="how" className="grid md:grid-cols-[1.2fr_0.8fr] gap-10 items-center">
          <div className="space-y-3">
            <p className={`text-xs uppercase tracking-[0.2em] ${darkMode ? "text-teal-200" : "text-teal-700"}`}>Flow</p>
            <h2 className="text-3xl font-bold">From CSV to delivery in four moves.</h2>
            <p className={`${darkMode ? "text-slate-300" : "text-slate-700"} max-w-2xl`}>
              Everything happens in one screen: upload, map variables, place them visually, preview, and run. The builder you see in the app is the exact workspace you’ll use after signing in.
            </p>
            <div className="space-y-2">
              {steps.map((step, idx) => (
                <div key={step} className="flex items-start gap-3">
                  <span className={`h-8 w-8 rounded-full ${darkMode ? "bg-teal-400/20 border border-teal-400/40 text-teal-200" : "bg-teal-100 border border-teal-300 text-teal-700"} font-semibold flex items-center justify-center`}>
                    {idx + 1}
                  </span>
                  <p className={darkMode ? "text-slate-100" : "text-slate-800"}>{step}</p>
                </div>
              ))}
            </div>
            <div className="flex gap-3">
              <Link to="/signup" className={`px-4 py-2 rounded-md font-semibold transition ${accentCta}`}>
                Try it now
              </Link>
              <Link to="/login" className={`px-4 py-2 rounded-md font-semibold transition ${outlineCta}`}>
                View my projects
              </Link>
            </div>
          </div>
          <div className={`p-6 rounded-2xl shadow-xl ${mutedCard}`}>
            <h3 className={`text-lg font-semibold mb-4 ${darkMode ? "text-teal-200" : "text-teal-700"}`}>What teams ship</h3>
            <ul className={`space-y-3 ${darkMode ? "text-slate-200" : "text-slate-700"}`}>
              <li className="flex gap-3">
                <span className={darkMode ? "text-teal-300" : "text-teal-600"}>●</span>
                Targeted ad creatives with the prospect’s logo and name.
              </li>
              <li className="flex gap-3">
                <span className={darkMode ? "text-teal-300" : "text-teal-600"}>●</span>
                Personalized sales one-pagers delivered as image links.
              </li>
              <li className="flex gap-3">
                <span className={darkMode ? "text-teal-300" : "text-teal-600"}>●</span>
                Partner updates with live performance numbers baked in.
              </li>
            </ul>
          </div>
        </section>

        <section id="pricing" className="grid md:grid-cols-3 gap-6">
          <div className={`p-6 rounded-2xl md:col-span-2 ${darkMode ? "bg-slate-900/70 border border-teal-400/30 shadow-lg shadow-teal-500/20" : "bg-white border border-teal-200 shadow-lg shadow-teal-200/40"}`}>
            <p className={`text-xs uppercase tracking-[0.2em] ${darkMode ? "text-teal-200" : "text-teal-700"}`}>Launch offer</p>
            <h3 className="text-2xl font-bold mt-2 mb-3">Start free, upgrade when you’re running batches.</h3>
            <p className={`${darkMode ? "text-slate-300" : "text-slate-700"} mb-4`}>
              Sign up and use the full builder for free while you experiment. When you’re ready to push more volume, pick a plan without losing your templates or mappings.
            </p>
            <div className={`flex flex-wrap gap-4 text-sm ${darkMode ? "text-slate-200" : "text-slate-700"}`}>
              <span className={`px-3 py-2 rounded-lg ${darkMode ? "bg-slate-800/70 border border-white/10" : "bg-slate-100 border border-slate-200"}`}>Unlimited templates</span>
              <span className={`px-3 py-2 rounded-lg ${darkMode ? "bg-slate-800/70 border border-white/10" : "bg-slate-100 border border-slate-200"}`}>3 free batch runs</span>
              <span className={`px-3 py-2 rounded-lg ${darkMode ? "bg-slate-800/70 border border-white/10" : "bg-slate-100 border border-slate-200"}`}>Cloud export ready</span>
            </div>
            <div className="mt-5 flex gap-3">
              <Link to="/signup" className={`px-4 py-2 rounded-md font-semibold transition ${accentCta}`}>
                Claim free access
              </Link>
              <Link to="/login" className={`px-4 py-2 rounded-md font-semibold transition ${outlineCta}`}>
                Log in
              </Link>
            </div>
          </div>
          <div className={`p-6 rounded-2xl space-y-3 ${mutedCard}`}>
            <p className={`text-xs uppercase tracking-[0.2em] ${darkMode ? "text-teal-200" : "text-teal-700"}`}>Support</p>
            <h4 className="text-xl font-semibold">Guided onboarding</h4>
            <p className={`${darkMode ? "text-slate-300" : "text-slate-700"}`}>Need a hand mapping your CSV or setting up templates? We’ll walk through your first run live.</p>
            <Link to="/signup" className={`inline-flex text-sm font-semibold ${darkMode ? "text-teal-200 hover:text-teal-100" : "text-teal-700 hover:text-teal-800"}`}>
              Book a slot →
            </Link>
          </div>
        </section>

        <section className="grid md:grid-cols-2 gap-6">
          {testimonials.map((item) => (
            <div key={item.name} className={`p-6 rounded-2xl ${mutedCard}`}>
              <p className={`text-lg ${darkMode ? "text-slate-100" : "text-slate-800"}`}>“{item.quote}”</p>
              <p className={`mt-3 text-sm ${darkMode ? "text-slate-400" : "text-slate-600"}`}>
                {item.name} · {item.title}
              </p>
            </div>
          ))}
        </section>

        <section className="p-8 rounded-2xl bg-gradient-to-r from-teal-400 via-cyan-300 to-indigo-400 text-slate-900 shadow-2xl shadow-teal-500/30">
          <div className="grid md:grid-cols-[2fr_1fr] gap-6 items-center">
            <div>
              <p className="text-xs uppercase tracking-[0.2em]">Get started</p>
              <h3 className="text-3xl font-bold mt-2 mb-3">Launch your first personalized mockup run today.</h3>
              <p className="text-slate-900/80 text-lg">
                Sign up for free, set up a template in minutes, and send your team live image URLs without manual design work.
              </p>
            </div>
            <div className="flex gap-3 md:justify-end">
              <Link to="/signup" className="px-4 py-3 rounded-lg bg-slate-900 text-white font-semibold hover:bg-slate-800 transition">
                Start free
              </Link>
              <Link to="/login" className="px-4 py-3 rounded-lg border border-slate-900/30 text-slate-900 font-semibold hover:border-slate-900 transition">
                Log in
              </Link>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
