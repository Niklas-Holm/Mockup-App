import React, { createContext, useContext, useEffect, useMemo, useState, useCallback } from "react";

const AuthContext = createContext(null);
const STORAGE_KEY = "mockupapp:auth";
const API_BASE = (typeof import.meta !== "undefined" && import.meta.env?.VITE_API_BASE) || "http://localhost:8000/api";

const emptyState = { token: null, user: null };

const loadState = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyState;
    const parsed = JSON.parse(raw);
    if (parsed && parsed.accounts) {
      localStorage.removeItem(STORAGE_KEY);
      return emptyState;
    }
    if (parsed && typeof parsed === "object" && ("token" in parsed || "user" in parsed)) {
      return { token: parsed.token || null, user: parsed.user || null };
    }
    return emptyState;
  } catch (e) {
    console.error("Failed to parse auth storage", e);
    return emptyState;
  }
};

const persistState = (state) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
};

const parseError = async (res) => {
  try {
    const data = await res.json();
    return data?.detail || data?.message || res.statusText || "Request failed";
  } catch {
    return res.statusText || "Request failed";
  }
};

export function AuthProvider({ children }) {
  const [state, setState] = useState(() => loadState());
  const [hasAccounts, setHasAccounts] = useState(false);
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    persistState(state);
  }, [state]);

  useEffect(() => {
    let cancelled = false;
    const bootstrap = async () => {
      try {
        const res = await fetch(`${API_BASE}/auth/has-users`);
        if (res.ok) {
          const data = await res.json();
          if (!cancelled) setHasAccounts(Boolean(data.hasUsers));
        }
      } catch (e) {
        console.error("Failed to check existing accounts", e);
      }

      if (state.token) {
        try {
          const res = await fetch(`${API_BASE}/auth/me`, {
            headers: { Authorization: `Bearer ${state.token}` },
          });
          if (res.ok) {
            const data = await res.json();
            if (!cancelled) setState((prev) => ({ ...prev, user: data.user || null }));
          } else if (!cancelled) {
            setState(emptyState);
          }
        } catch (e) {
          if (!cancelled) setState(emptyState);
        }
      }
      if (!cancelled) setInitializing(false);
    };
    bootstrap();
    return () => {
      cancelled = true;
    };
  }, []);

  const authFetch = useCallback(
    async (url, options = {}) => {
      const headers = new Headers(options.headers || {});
      if (state.token) {
        headers.set("Authorization", `Bearer ${state.token}`);
      }
      const res = await fetch(url, { ...options, headers });
      if (res.status === 401) {
        setState(emptyState);
        throw new Error("Session expired. Please log in again.");
      }
      return res;
    },
    [state.token]
  );

  const signup = async ({ name, email, password }) => {
    const normalizedEmail = (email || "").trim().toLowerCase();
    if (!normalizedEmail || !password) {
      throw new Error("Email and password are required.");
    }
    const res = await fetch(`${API_BASE}/auth/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name?.trim(), email: normalizedEmail, password }),
    });
    if (!res.ok) {
      throw new Error(await parseError(res));
    }
    const data = await res.json();
    setState({ token: data.access_token, user: data.user });
    setHasAccounts(true);
  };

  const login = async ({ email, password }) => {
    const normalizedEmail = (email || "").trim().toLowerCase();
    if (!normalizedEmail || !password) {
      throw new Error("Email and password are required.");
    }
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: normalizedEmail, password }),
    });
    if (!res.ok) {
      throw new Error(await parseError(res));
    }
    const data = await res.json();
    setState({ token: data.access_token, user: data.user });
    setHasAccounts(true);
  };

  const logout = () => {
    setState(emptyState);
  };

  const value = useMemo(
    () => ({
      user: state.user,
      token: state.token,
      signup,
      login,
      logout,
      hasAccounts,
      authFetch,
      initializing,
    }),
    [state.user, state.token, hasAccounts, authFetch, initializing]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
