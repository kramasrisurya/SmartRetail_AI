import React, { createContext, useContext, useState, useEffect } from "react";
import { UserSession } from "../types";
import { api } from "../lib/api";

interface AuthContextType {
  session: UserSession | null;
  isAuthenticated: boolean;
  theme: "dark" | "light";
  activeStore: { id: string; name: string };
  stores: { id: string; name: string }[];
  setActiveStore: (store: { id: string; name: string }) => void;
  toggleTheme: () => void;
  login: (username: string, password?: string) => Promise<void>;
  logout: () => void;
}

const STORES = [
  { id: "1", name: "Store #01 — Downtown Flagship" },
  { id: "2", name: "Store #02 — Metro Center" },
  { id: "3", name: "Store #03 — Westside Mall" },
];

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<UserSession | null>(() => {
    const token = sessionStorage.getItem("storesight_token");
    const user = sessionStorage.getItem("storesight_user");
    const role = sessionStorage.getItem("storesight_role");
    if (token && user && role) {
      return {
        token,
        user,
        role,
        storeId: "1",
        storeName: STORES[0].name,
      };
    }
    return null;
  });

  const [theme, setTheme] = useState<"dark" | "light">(() => {
    return (localStorage.getItem("storesight_theme") as "dark" | "light") || "light";
  });

  const [activeStore, setActiveStore] = useState(STORES[0]);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === "light") {
      root.classList.add("light");
      root.classList.remove("dark");
    } else {
      root.classList.add("dark");
      root.classList.remove("light");
    }
    localStorage.setItem("storesight_theme", theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  };

  const login = async (username: string, password: string = "password") => {
    const res = await api.login(username, password);
    const newSession: UserSession = {
      token: res.access_token,
      user: username,
      role: res.role,
      storeId: activeStore.id,
      storeName: activeStore.name,
    };
    sessionStorage.setItem("storesight_token", res.access_token);
    sessionStorage.setItem("storesight_user", username);
    sessionStorage.setItem("storesight_role", res.role);
    setSession(newSession);
  };

  const logout = () => {
    sessionStorage.removeItem("storesight_token");
    sessionStorage.removeItem("storesight_user");
    sessionStorage.removeItem("storesight_role");
    setSession(null);
  };

  return (
    <AuthContext.Provider
      value={{
        session,
        isAuthenticated: !!session,
        theme,
        activeStore,
        stores: STORES,
        setActiveStore,
        toggleTheme,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
