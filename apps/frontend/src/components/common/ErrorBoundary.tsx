import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
  fallbackMessage?: string;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error caught by ErrorBoundary:", error, errorInfo);
    this.setState({ errorInfo });
  }

  public handleRetry = () => {
    if (this.props.onReset) {
      this.props.onReset();
    }
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div
          role="alert"
          aria-live="assertive"
          className="w-full min-h-[320px] flex items-center justify-center p-6 bg-card border border-destructive/30 rounded-lg shadow-sm"
        >
          <div className="max-w-md text-center flex flex-col items-center">
            <div className="w-12 h-12 rounded-full bg-destructive/10 text-destructive flex items-center justify-center mb-4">
              <AlertTriangle className="w-6 h-6" aria-hidden="true" />
            </div>

            <h3 className="text-base font-semibold text-foreground mb-1">
              {this.props.fallbackTitle || "Component Failed to Load"}
            </h3>

            <p className="text-xs text-muted-foreground mb-4 leading-relaxed">
              {this.props.fallbackMessage ||
                this.state.error?.message ||
                "An unexpected runtime error occurred while rendering this section."}
            </p>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={this.handleRetry}
                className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-md bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              >
                <RefreshCw className="w-3.5 h-3.5" aria-hidden="true" />
                Retry View
              </button>

              <button
                type="button"
                onClick={() => window.location.reload()}
                className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-md bg-muted text-foreground text-xs font-medium hover:bg-muted/80 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-muted"
              >
                <Home className="w-3.5 h-3.5" aria-hidden="true" />
                Reload Page
              </button>
            </div>

            {process.env.NODE_ENV !== "production" && this.state.error && (
              <details className="mt-6 text-left w-full bg-muted/40 p-3 rounded text-[11px] font-mono text-muted-foreground overflow-auto max-h-36">
                <summary className="cursor-pointer font-medium text-foreground">Stack Trace</summary>
                <pre className="mt-2 whitespace-pre-wrap">{this.state.error.stack}</pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
