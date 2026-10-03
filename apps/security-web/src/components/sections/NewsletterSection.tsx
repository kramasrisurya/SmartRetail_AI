'use client';

import React, { useState } from 'react';
import { Container } from '../ui/Container';
import { Button } from '../ui/Button';
import { Mail, CheckCircle2, ShieldCheck } from 'lucide-react';

export const NewsletterSection: React.FC = () => {
  const [email, setEmail] = useState('');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [error, setError] = useState('');

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Please provide a valid corporate email address.');
      return;
    }
    setError('');
    setIsSubscribed(true);
  };

  return (
    <section className="py-16 bg-gradient-to-br from-primary via-navy-900 to-navy-950 text-white relative overflow-hidden">
      {/* Decorative background glow circles */}
      <div className="absolute top-1/2 -left-20 -translate-y-1/2 w-64 h-64 bg-secondary/15 rounded-full blur-2xl pointer-events-none" />
      <div className="absolute top-1/2 -right-20 -translate-y-1/2 w-64 h-64 bg-accent/15 rounded-full blur-2xl pointer-events-none" />

      <Container className="relative z-10">
        <div className="max-w-2xl mx-auto text-center space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-secondary/20 border border-secondary/30 text-cyan-300 text-xs font-bold uppercase tracking-widest">
            <Mail className="w-3.5 h-3.5" />
            <span>Stay Ahead in Enterprise Security</span>
          </div>

          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold font-heading text-white tracking-tight">
            Subscribe to Aegis Engineering Bulletins
          </h2>

          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-lg mx-auto">
            Receive monthly security advisories, new firmware updates, optical AI research whitepapers, and partner webinar invitations directly to your inbox.
          </p>

          {isSubscribed ? (
            <div className="p-4 bg-emerald-500/15 border border-emerald-500/30 rounded-2xl max-w-md mx-auto flex items-center justify-center gap-3 text-emerald-300 text-xs sm:text-sm font-semibold">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              <span>Thank you for subscribing! Check your inbox for confirmation.</span>
            </div>
          ) : (
            <form onSubmit={handleSubscribe} className="max-w-md mx-auto space-y-2">
              <div className="flex flex-col sm:flex-row gap-2.5">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your corporate email..."
                  className="flex-1 bg-white/10 backdrop-blur-md border border-slate-700 text-white placeholder:text-slate-400 text-sm rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-transparent transition-all"
                />
                <Button
                  type="submit"
                  variant="secondary"
                  size="md"
                  className="shrink-0 py-3"
                >
                  Subscribe
                </Button>
              </div>
              {error && (
                <p className="text-xs text-rose-400 text-left pl-2 font-medium">{error}</p>
              )}
              <p className="text-[11px] text-slate-400">
                🔒 We respect your privacy. Zero spam. Unsubscribe at any time.
              </p>
            </form>
          )}
        </div>
      </Container>
    </section>
  );
};
