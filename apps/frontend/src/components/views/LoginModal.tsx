import React, { useState } from "react";
import { AlertCircle, Lock, User as UserIcon, Shield } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { analytics } from "../../lib/analytics";

interface LoginModalProps {
  isOpen: boolean;
  onClose?: () => void;
  onOpenPrivacy?: () => void;
  onOpenTerms?: () => void;
}

export function LoginModal({ isOpen, onClose, onOpenPrivacy, onOpenTerms }: LoginModalProps) {
  const { login } = useAuth();
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("password");
  const [honeypot, setHoneypot] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanUser = username.trim();
    if (!cleanUser) {
      setError("Please enter a username.");
      return;
    }
    if (cleanUser.length < 3) {
      setError("Username must be at least 3 characters.");
      return;
    }
    if (!password || password.length < 4) {
      setError("Password must be at least 4 characters.");
      return;
    }
    if (honeypot.trim()) {
      setError("Bot submission rejected.");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await login(cleanUser, password);
      analytics.trackEvent("Auth", "login_success", cleanUser);
      if (onClose) onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Invalid credentials.";
      setError(msg);
      analytics.trackEvent("Auth", "login_failed", cleanUser);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = async (user: string) => {
    setUsername(user);
    setPassword("password");
    setLoading(true);
    setError(null);
    try {
      await login(user, "password");
      analytics.trackEvent("Auth", "quick_login_success", user);
      if (onClose) onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to sign in.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const demoAccounts = [
    { username: "admin", label: "Admin", desc: "Full organization access" },
    { username: "op1", label: "Operator", desc: "Live surveillance & alerts" },
    { username: "manager", label: "Manager", desc: "Store queue & analytics" },
    { username: "viewer", label: "Viewer", desc: "Read-only access" },
  ];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="login-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-100"
    >
      <div className="relative w-full max-w-sm rounded-[6px] border border-border bg-card p-6 shadow-xl text-foreground">
        {/* Clean Header */}
        <div className="mb-5 space-y-1">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-7 h-7 rounded-md bg-primary/10 text-primary flex items-center justify-center border border-primary/20">
              <Shield className="w-4 h-4" />
            </div>
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              SmartRetail AI
            </span>
          </div>
          <h2 id="login-title" className="text-base font-semibold tracking-tight text-foreground">
            Sign In to Store Operations
          </h2>
          <p className="text-xs text-muted-foreground">
            Enter your operator credentials to access camera feeds and intelligence.
          </p>
        </div>

        {error && (
          <div
            role="alert"
            className="mb-4 p-2.5 rounded-[4px] bg-red-500/10 border border-red-500/20 text-xs text-red-600 dark:text-red-400 flex items-center gap-2"
          >
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          {/* Honeypot field (hidden from real users) */}
          <div className="hidden" aria-hidden="true">
            <label htmlFor="website">Website</label>
            <input
              id="website"
              type="text"
              name="website"
              value={honeypot}
              onChange={(e) => setHoneypot(e.target.value)}
              tabIndex={-1}
              autoComplete="off"
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="username" className="block text-xs font-medium text-foreground">
              Username
            </label>
            <input
              id="username"
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-[4px] border border-border bg-background text-foreground text-xs placeholder:text-muted-foreground/60 focus:outline-none focus:border-primary transition"
              placeholder="e.g. admin, op1, manager"
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="password-field" className="block text-xs font-medium text-foreground">
              Password
            </label>
            <input
              id="password-field"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-[4px] border border-border bg-background text-foreground text-xs placeholder:text-muted-foreground/60 focus:outline-none focus:border-primary transition"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 px-3 rounded-[4px] bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition shadow-sm disabled:opacity-50 mt-1"
          >
            {loading ? "Authenticating..." : "Sign In"}
          </button>
        </form>

        {/* Demo Accounts */}
        <div className="mt-5 pt-4 border-t border-border space-y-2">
          <div className="text-[11px] font-medium text-muted-foreground">Demo Accounts (One-Click)</div>
          <div className="grid grid-cols-2 gap-1.5">
            {demoAccounts.map((acc) => (
              <button
                key={acc.username}
                type="button"
                onClick={() => handleQuickLogin(acc.username)}
                disabled={loading}
                className="text-left p-1.5 rounded-[4px] border border-border hover:bg-muted text-[11px] transition text-muted-foreground hover:text-foreground disabled:opacity-50"
              >
                <div className="font-semibold text-foreground">{acc.label}</div>
                <div className="text-[10px] text-muted-foreground truncate">{acc.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Footer Links */}
        <div className="mt-4 text-center text-[11px] text-muted-foreground flex items-center justify-center gap-3">
          {onOpenPrivacy && (
            <button
              type="button"
              onClick={onOpenPrivacy}
              className="hover:text-foreground underline transition"
            >
              Privacy Policy
            </button>
          )}
          {onOpenTerms && (
            <button
              type="button"
              onClick={onOpenTerms}
              className="hover:text-foreground underline transition"
            >
              Terms of Service
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default LoginModal;
