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
      className="fixed bottom-6 right-6 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none"
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

        const leftAccent = isSuccess
          ? "before:bg-emerald-500"
          : isError
          ? "before:bg-red-500"
          : isWarning
          ? "before:bg-amber-500"
          : "before:bg-primary";

        return (
          <div
            key={t.id}
            role="status"
            className={cn(
              "pointer-events-auto relative overflow-hidden flex items-start gap-3 p-3.5 rounded-[10px] border border-border bg-card shadow-modal transition-all duration-200 animate-slide-in-right before:absolute before:left-0 before:top-0 before:bottom-0 before:w-[3px]",
              leftAccent
            )}
          >
            <Icon
              className={cn(
                "w-4 h-4 mt-0.5 shrink-0",
                isSuccess && "text-emerald-500",
                isError && "text-red-500",
                isWarning && "text-amber-500",
                !isSuccess && !isError && !isWarning && "text-primary"
              )}
              aria-hidden="true"
            />

            <div className="flex-1 text-[13px] text-foreground font-normal leading-relaxed">{t.text}</div>

            <button
              type="button"
              onClick={() => dismiss(t.id)}
              aria-label="Dismiss notification"
              className="shrink-0 p-1 rounded-[4px] text-text-tertiary hover:text-foreground hover:bg-surface-elevated transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
            >
              <X className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
          </div>
        );
      })}
    </div>
  );
}

export default ToastContainer;
