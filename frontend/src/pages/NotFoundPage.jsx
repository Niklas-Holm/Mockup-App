import React from "react";
import { Link } from "react-router-dom";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-50 px-6">
      <div className="text-center space-y-4">
        <p className="text-xs uppercase tracking-[0.2em] text-teal-200">404</p>
        <h1 className="text-4xl font-bold">Page not found</h1>
        <p className="text-slate-300">Looks like this link is broken. Pick a destination below.</p>
        <div className="flex gap-3 justify-center">
          <Link to="/" className="px-4 py-2 rounded-md bg-teal-400 text-slate-900 font-semibold hover:bg-teal-300 transition">
            Go to landing
          </Link>
          <Link to="/login" className="px-4 py-2 rounded-md border border-white/20 text-slate-100 font-semibold hover:border-teal-200/60 transition">
            Log in
          </Link>
        </div>
      </div>
    </div>
  );
}
