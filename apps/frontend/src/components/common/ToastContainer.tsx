import React from "react";
import { useToast } from "../../store/useToastStore";
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from "lucide-react";
import { cn } from "../../lib/utils";

export function ToastContainer() {
  const { toasts, dismiss } = useToast();

  if (toasts.length === 0) return null;

  return (
    <div
      aria-live="polite"
      aria-atomic="false"
      className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none"
    >
      {toasts.map((t) => {
        const isSuccess = t.type === "success";
        const isError = t.type === "error";
        const isWarning = t.type === "warning";

        const Icon = isSuccess
          ? CheckCircle2
          : isError
          ? AlertCircle
          : isWarning
          ? AlertTriangle
          : Info;

        return (
          <div
            key={t.id}
            role="status"
            className={cn(
              "pointer-events-auto flex items-start gap-2.5 p-3 rounded-lg border shadow-lg backdrop-blur-md transition-all duration-200 animate-in slide-in-from-bottom-5",
              isSuccess && "bg-emerald-950/90 text-emerald-100 border-emerald-800/60",
              isError && "bg-destructive/95 text-destructive-foreground border-destructive/80",
              isWarning && "bg-amber-950/90 text-amber-100 border-amber-800/60",
              !isSuccess && !isError && !isWarning && "bg-card/95 text-foreground border-border"
            )}
          >
            <Icon
              className={cn(
                "w-4 h-4 mt-0.5 shrink-0",
                isSuccess && "text-emerald-400",
                isError && "text-white",
                isWarning && "text-amber-400",
                !isSuccess && !isError && !isWarning && "text-primary"
              )}
              aria-hidden="true"
            />

            <div className="flex-1 text-xs font-normal leading-relaxed">{t.text}</div>

            <button
              type="button"
              onClick={() => dismiss(t.id)}
              aria-label="Dismiss notification"
              className="shrink-0 p-0.5 rounded text-current opacity-70 hover:opacity-100 transition-opacity focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-current"
            >
              <X className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
