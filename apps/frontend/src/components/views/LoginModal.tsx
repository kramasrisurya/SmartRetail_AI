import React, { useState } from "react";
import { AlertCircle } from "lucide-react";
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
    } catch (err: any) {
      setError(err.message || "Invalid credentials.");
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
    } catch (err: any) {
      setError(err.message || "Failed to sign in.");
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-100">
      <div className="relative w-full max-w-sm rounded-[6px] border border-border bg-card p-6 shadow-md text-foreground">
        {/* Clean Header */}
        <div className="mb-5 space-y-1">
          <h2 className="text-base font-semibold tracking-tight text-foreground">Sign in to StoreSight</h2>
          <p className="text-xs text-muted-foreground">Enter your operator credentials to access camera feeds.</p>
        </div>

        {error && (
          <div className="mb-4 p-2.5 rounded-[4px] bg-red-500/10 border border-red-500/20 text-xs text-red-600 dark:text-red-400 flex items-center gap-2">
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
              tabIndex={-1}
              autoComplete="off"
              value={honeypot}
              onChange={(e) => setHoneypot(e.target.value)}
            />
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-medium text-foreground">
              Username
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => {
                setUsername(e.target.value);
                if (error) setError(null);
              }}
              placeholder="e.g. admin, op1"
              className="w-full px-2.5 py-1.5 rounded-[4px] border border-border bg-background text-foreground text-xs focus:outline-none focus:border-foreground transition"
              required
              minLength={3}
            />
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-medium text-foreground">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (error) setError(null);
              }}
              placeholder="Password"
              className="w-full px-2.5 py-1.5 rounded-[4px] border border-border bg-background text-foreground text-xs focus:outline-none focus:border-foreground transition"
              required
              minLength={4}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-1.5 px-3 rounded-[4px] bg-foreground text-background text-xs font-medium hover:opacity-90 transition disabled:opacity-50"
          >
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>

        {/* Demo Roles Shortcut */}
        <div className="mt-5 pt-4 border-t border-border space-y-2">
          <span className="text-[11px] font-medium text-muted-foreground block">
            Demo accounts
          </span>
          <div className="grid grid-cols-2 gap-1.5">
            {demoAccounts.map((account) => (
              <button
                key={account.username}
                type="button"
                onClick={() => handleQuickLogin(account.username)}
                className="p-1.5 rounded-[4px] border border-border hover:bg-muted text-left transition text-xs"
              >
                <div className="font-medium text-foreground">{account.label}</div>
                <div className="text-[10px] text-muted-foreground truncate">{account.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Legal links */}
        <div className="mt-4 pt-3 border-t border-border/60 flex items-center justify-center gap-3 text-[11px] text-muted-foreground">
          {onOpenPrivacy && (
            <button onClick={onOpenPrivacy} className="hover:text-foreground transition">
              Privacy policy
            </button>
          )}
          <span>·</span>
          {onOpenTerms && (
            <button onClick={onOpenTerms} className="hover:text-foreground transition">
              Terms of service
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default LoginModal;
