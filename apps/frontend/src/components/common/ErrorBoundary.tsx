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
          className="w-full min-h-[340px] flex items-center justify-center p-8 bg-card border border-destructive/20 rounded-[10px] shadow-card animate-fade-up"
        >
          <div className="max-w-md text-center flex flex-col items-center">
            <div className="w-12 h-12 rounded-[10px] bg-destructive/10 text-destructive flex items-center justify-center mb-4 border border-destructive/20">
              <AlertTriangle className="w-6 h-6" aria-hidden="true" />
            </div>

            <h3 className="text-[16px] font-semibold text-foreground tracking-tight mb-1.5">
              {this.props.fallbackTitle || "Component Failed to Load"}
            </h3>

            <p className="text-[14px] text-text-secondary mb-6 leading-relaxed">
              {this.props.fallbackMessage ||
                this.state.error?.message ||
                "An unexpected runtime error occurred while rendering this view."}
            </p>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={this.handleRetry}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-[8px] bg-primary text-primary-foreground text-[14px] font-medium hover:bg-primary-hover active:bg-indigo-800 transition-all duration-150 shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              >
                <RefreshCw className="w-4 h-4" aria-hidden="true" />
                <span>Retry View</span>
              </button>

              <button
                type="button"
                onClick={() => window.location.reload()}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-[8px] border border-border bg-card text-text-secondary hover:text-foreground hover:bg-surface-elevated text-[14px] font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <Home className="w-4 h-4" aria-hidden="true" />
                <span>Reload Page</span>
              </button>
            </div>

            {process.env.NODE_ENV !== "production" && this.state.error && (
              <details className="mt-6 text-left w-full bg-surface-elevated p-3.5 rounded-[8px] border border-border text-[11px] font-mono text-text-secondary overflow-auto max-h-36">
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

export default ErrorBoundary;
