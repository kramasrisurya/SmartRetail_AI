import { useState, useEffect } from "react";
import { ToastNotification } from "../types";

type Listener = () => void;

class ToastManager {
  private toasts: ToastNotification[] = [];
  private listeners: Set<Listener> = new Set();

  getToasts(): ToastNotification[] {
    return this.toasts;
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

  show(text: string, type: "success" | "error" | "info" | "warning" = "info", duration = 4000): string {
    const id = `toast_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const toast: ToastNotification = {
      id,
      text,
      type,
      timestamp: Date.now(),
      duration,
    };

    this.toasts = [...this.toasts, toast];
    this.notify();

    if (duration > 0) {
      setTimeout(() => {
        this.dismiss(id);
      }, duration);
    }

    return id;
  }

  success(text: string, duration = 4000): string {
    return this.show(text, "success", duration);
  }

  error(text: string, duration = 5000): string {
    return this.show(text, "error", duration);
  }

  info(text: string, duration = 4000): string {
    return this.show(text, "info", duration);
  }

  warning(text: string, duration = 4500): string {
    return this.show(text, "warning", duration);
  }

  dismiss(id: string): void {
    this.toasts = this.toasts.filter((t) => t.id !== id);
    this.notify();
  }

  clear(): void {
    this.toasts = [];
    this.notify();
  }
}

export const toast = new ToastManager();

export function useToast() {
  const [toasts, setToasts] = useState<ToastNotification[]>(() => toast.getToasts());

  useEffect(() => {
    return toast.subscribe(() => {
      setToasts([...toast.getToasts()]);
    });
  }, []);

  return {
    toasts,
    toast,
    dismiss: (id: string) => toast.dismiss(id),
  };
}
