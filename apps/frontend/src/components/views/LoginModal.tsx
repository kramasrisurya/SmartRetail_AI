import React, { useState } from "react";
import { AlertCircle, Lock, User as UserIcon, Shield, Sparkles } from "lucide-react";
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
    { username: "admin", label: "Admin", desc: "Full org access" },
    { username: "op1", label: "Operator", desc: "Surveillance & alerts" },
    { username: "manager", label: "Manager", desc: "Store queue & analytics" },
    { username: "viewer", label: "Viewer", desc: "Read-only view" },
  ];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="login-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-up"
    >
      <div className="relative w-full max-w-md rounded-[12px] border border-border bg-card p-8 shadow-modal text-foreground">
        {/* Header */}
        <div className="mb-6 space-y-1.5 text-center flex flex-col items-center">
          <div className="w-10 h-10 rounded-[10px] bg-primary/10 text-primary flex items-center justify-center border border-primary/20 mb-2 shadow-xs">
            <Sparkles className="w-5 h-5" />
          </div>
          <h2 id="login-title" className="text-[20px] font-semibold tracking-tight text-foreground">
            Sign In to SmartRetail AI
          </h2>
          <p className="text-[14px] text-text-secondary">
            Enterprise store operations, loss prevention & surveillance
          </p>
        </div>

        {error && (
          <div
            role="alert"
            className="mb-5 p-3 rounded-[8px] bg-destructive/10 border border-destructive/20 text-[13px] text-destructive flex items-center gap-2.5"
          >
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
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

          <div className="space-y-1.5">
            <label htmlFor="username" className="block text-[13px] font-medium text-foreground">
              Operator Username
            </label>
            <input
              id="username"
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-3.5 py-2 rounded-[8px] border border-border bg-card text-foreground text-[14px] placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-primary shadow-xs transition"
              placeholder="e.g. admin, op1, manager"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="password-field" className="block text-[13px] font-medium text-foreground">
              Security Password
            </label>
            <input
              id="password-field"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3.5 py-2 rounded-[8px] border border-border bg-card text-foreground text-[14px] placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-primary shadow-xs transition"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 px-4 rounded-[8px] bg-primary text-primary-foreground text-[14px] font-semibold hover:bg-primary-hover active:bg-indigo-800 transition-all duration-150 shadow-xs disabled:opacity-50 mt-2"
          >
            {loading ? "Authenticating Session..." : "Sign In to Console"}
          </button>
        </form>

        {/* Demo Accounts */}
        <div className="mt-6 pt-5 border-t border-border space-y-2.5">
          <div className="text-[12px] font-semibold text-text-tertiary uppercase tracking-[0.04em]">
            Demo Roles (Instant Access)
          </div>
          <div className="grid grid-cols-2 gap-2">
            {demoAccounts.map((acc) => (
              <button
                key={acc.username}
                type="button"
                onClick={() => handleQuickLogin(acc.username)}
                disabled={loading}
                className="text-left p-2.5 rounded-[8px] border border-border bg-surface-elevated hover:bg-muted hover:border-primary/30 text-[12px] transition text-text-secondary hover:text-foreground disabled:opacity-50 shadow-xs"
              >
                <div className="font-semibold text-foreground text-[13px]">{acc.label}</div>
                <div className="text-[11px] text-text-tertiary truncate">{acc.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Footer Links */}
        <div className="mt-5 text-center text-[12px] text-text-tertiary flex items-center justify-center gap-4">
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
