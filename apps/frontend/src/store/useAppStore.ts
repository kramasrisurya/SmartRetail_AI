import { useState, useEffect } from "react";
import { Alert, Camera, StoreOption, UserSession, ViewTab } from "../types";
import { api } from "../lib/api";

export const STORES: StoreOption[] = [
  { id: "1", name: "Store #01 — Downtown Flagship" },
  { id: "2", name: "Store #02 — Metro Center" },
  { id: "3", name: "Store #03 — Westside Mall" },
];

interface AppState {
  // Navigation & UI
  currentTab: ViewTab;
  mobileMenuOpen: boolean;
  commandPaletteOpen: boolean;
  loginModalOpen: boolean;
  unauthLegalTab: "privacy" | "terms" | null;
  theme: "dark" | "light";

  // Active Store & User Session
  activeStore: StoreOption;
  stores: StoreOption[];
  session: UserSession | null;
  isAuthenticated: boolean;

  // Selected Entities
  selectedAlert: Alert | null;
  selectedCamera: Camera | null;
  selectedJourneyKey: string | null;
}

type Listener = () => void;

class AppStore {
  private state: AppState;
  private listeners: Set<Listener> = new Set();

  constructor() {
    const token = sessionStorage.getItem("storesight_token");
    const user = sessionStorage.getItem("storesight_user");
    const role = sessionStorage.getItem("storesight_role");
    const savedTheme = (localStorage.getItem("storesight_theme") as "dark" | "light") || "light";

    const session: UserSession | null =
      token && user && role
        ? {
            token,
            user,
            role,
            storeId: "1",
            storeName: STORES[0].name,
          }
        : null;

    this.state = {
      currentTab: "overview",
      mobileMenuOpen: false,
      commandPaletteOpen: false,
      loginModalOpen: false,
      unauthLegalTab: null,
      theme: savedTheme,
      activeStore: STORES[0],
      stores: STORES,
      session,
      isAuthenticated: !!session,
      selectedAlert: null,
      selectedCamera: null,
      selectedJourneyKey: null,
    };

    this.applyTheme(savedTheme);
  }

  getState(): AppState {
    return this.state;
  }

  setState(partial: Partial<AppState> | ((prev: AppState) => Partial<AppState>)): void {
    const next = typeof partial === "function" ? partial(this.state) : partial;
    this.state = { ...this.state, ...next };
    this.notify();
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify(): void {
    this.listeners.forEach((listener) => listener());
  }

  setCurrentTab(tab: ViewTab) {
    this.setState({ currentTab: tab, mobileMenuOpen: false });
  }

  setMobileMenuOpen(open: boolean) {
    this.setState({ mobileMenuOpen: open });
  }

  setCommandPaletteOpen(open: boolean) {
    this.setState({ commandPaletteOpen: open });
  }

  setLoginModalOpen(open: boolean) {
    this.setState({ loginModalOpen: open });
  }

  setUnauthLegalTab(tab: "privacy" | "terms" | null) {
    this.setState({ unauthLegalTab: tab });
  }

  setActiveStore(store: StoreOption) {
    this.setState({ activeStore: store });
  }

  setSelectedAlert(alert: Alert | null) {
    this.setState({ selectedAlert: alert });
  }

  setSelectedCamera(camera: Camera | null) {
    this.setState({ selectedCamera: camera });
  }

  setSelectedJourneyKey(key: string | null) {
    this.setState({ selectedJourneyKey: key });
  }

  private applyTheme(theme: "dark" | "light") {
    const root = document.documentElement;
    if (theme === "light") {
      root.classList.add("light");
      root.classList.remove("dark");
    } else {
      root.classList.add("dark");
      root.classList.remove("light");
    }
    localStorage.setItem("storesight_theme", theme);
  }

  toggleTheme() {
    const nextTheme = this.state.theme === "dark" ? "light" : "dark";
    this.applyTheme(nextTheme);
    this.setState({ theme: nextTheme });
  }

  async login(username: string, password: string = "password"): Promise<void> {
    const res = await api.login(username, password);
    const newSession: UserSession = {
      token: res.access_token,
      user: username,
      role: res.role,
      storeId: this.state.activeStore.id,
      storeName: this.state.activeStore.name,
    };
    sessionStorage.setItem("storesight_token", res.access_token);
    sessionStorage.setItem("storesight_user", username);
    sessionStorage.setItem("storesight_role", res.role);

    this.setState({
      session: newSession,
      isAuthenticated: true,
      loginModalOpen: false,
    });
  }

  logout(): void {
    sessionStorage.removeItem("storesight_token");
    sessionStorage.removeItem("storesight_user");
    sessionStorage.removeItem("storesight_role");

    this.setState({
      session: null,
      isAuthenticated: false,
      selectedAlert: null,
      selectedCamera: null,
    });
  }
}

export const appStore = new AppStore();

export function useAppStore<T>(selector: (state: AppState) => T): T {
  const [slice, setSlice] = useState<T>(() => selector(appStore.getState()));

  useEffect(() => {
    return appStore.subscribe(() => {
      const nextSlice = selector(appStore.getState());
      setSlice((prev) => {
        if (Object.is(prev, nextSlice)) return prev;
        return nextSlice;
      });
    });
  }, [selector]);

  return slice;
}
