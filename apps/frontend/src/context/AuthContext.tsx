import React from "react";
import { useAppStore, appStore } from "../store/useAppStore";
import { StoreOption, UserSession } from "../types";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

export function useAuth() {
  const session = useAppStore((s) => s.session);
  const isAuthenticated = useAppStore((s) => s.isAuthenticated);
  const theme = useAppStore((s) => s.theme);
  const activeStore = useAppStore((s) => s.activeStore);
  const stores = useAppStore((s) => s.stores);

  return {
    session,
    isAuthenticated,
    theme,
    activeStore,
    stores,
    setActiveStore: (store: StoreOption) => appStore.setActiveStore(store),
    toggleTheme: () => appStore.toggleTheme(),
    login: (username: string, password?: string) => appStore.login(username, password),
    logout: () => appStore.logout(),
  };
}
