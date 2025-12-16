import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

const AuthContext = createContext(null);
const STORAGE_KEY = "mockupapp:auth";

const emptyState = { accounts: [], activeEmail: null };

const loadState = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : emptyState;
  } catch (e) {
    console.error("Failed to parse auth storage", e);
    return emptyState;
  }
};

const persistState = (state) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
};

export function AuthProvider({ children }) {
  const [state, setState] = useState(() => loadState());

  useEffect(() => {
    persistState(state);
  }, [state]);

  const activeUser = useMemo(
    () => state.accounts.find((a) => a.email === state.activeEmail) || null,
    [state.accounts, state.activeEmail]
  );

  const signup = ({ name, email, password }) => {
    const normalizedEmail = (email || "").trim().toLowerCase();
    const trimmedName = (name || "").trim();
    if (!normalizedEmail || !password) {
      throw new Error("Email and password are required.");
    }
    setState((prev) => {
      if (prev.accounts.some((acc) => acc.email === normalizedEmail)) {
        throw new Error("An account with that email already exists.");
      }
      const account = {
        id: `user_${Date.now()}`,
        name: trimmedName || normalizedEmail.split("@")[0],
        email: normalizedEmail,
        password,
      };
      return { accounts: [...prev.accounts, account], activeEmail: account.email };
    });
  };

  const login = ({ email, password }) => {
    const normalizedEmail = (email || "").trim().toLowerCase();
    const match = state.accounts.find((acc) => acc.email === normalizedEmail);
    if (!match || match.password !== password) {
      throw new Error("Invalid email or password.");
    }
    setState((prev) => ({ ...prev, activeEmail: match.email }));
  };

  const logout = () => {
    setState((prev) => ({ ...prev, activeEmail: null }));
  };

  const value = useMemo(
    () => ({
      user: activeUser,
      signup,
      login,
      logout,
      hasAccounts: state.accounts.length > 0,
    }),
    [activeUser, state.accounts.length]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
