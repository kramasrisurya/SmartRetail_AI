import React from "react";
import { ArrowLeft } from "lucide-react";

interface TermsViewProps {
  onBack?: () => void;
}

export function TermsView({ onBack }: TermsViewProps) {
  return (
    <article className="max-w-2xl mx-auto py-8 space-y-6 text-foreground text-[14px] leading-relaxed animate-fade-up">
      {/* Header */}
      <div className="border-b border-border pb-4 flex items-center justify-between">
        <div>
          <h1 className="text-[20px] font-semibold tracking-tight text-foreground">Terms of Service</h1>
          <p className="text-[12px] text-text-tertiary mt-0.5">Last updated: October 2026</p>
        </div>
        {onBack && (
          <button
            onClick={onBack}
            className="flex items-center gap-2 px-3 py-1.5 rounded-[8px] border border-border bg-card text-[13px] text-text-secondary hover:text-foreground hover:bg-surface-elevated transition shadow-xs"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back</span>
          </button>
        )}
      </div>

      {/* Notice */}
      <div className="p-4 rounded-[10px] border border-border bg-surface-elevated text-[13px] text-text-secondary">
        Note: This is a placeholder terms document for operational testing and internal review. It should be replaced with vetted commercial terms prior to production deployment.
      </div>

      {/* Terms Body */}
      <div className="space-y-5">
        <section className="space-y-2">
          <h2 className="text-[15px] font-semibold text-foreground">1. Acceptance of Terms</h2>
          <p className="text-text-secondary">
            By logging into or accessing the StoreSight dashboard, you agree to comply with these terms, your organization's internal acceptable use policies, and applicable local surveillance regulations.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-[15px] font-semibold text-foreground">2. Operator Responsibilities</h2>
          <p className="text-text-secondary">
            Authorized operators must protect their account credentials and only inspect video streams and customer events in the course of their assigned duties. Exporting, screen recording, or distributing footage outside authorized channels is strictly prohibited.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-[15px] font-semibold text-foreground">3. System Recommendations and Human Review</h2>
          <p className="text-text-secondary">
            StoreSight generates automated notifications based on heuristic vision rules. Alerts represent probabilistic indicators, not definitive determinations of theft or wrongdoing. A trained operator must verify evidence before initiating any customer interaction or store escalation.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-[15px] font-semibold text-foreground">4. System Availability and Maintenance</h2>
          <p className="text-text-secondary">
            While we strive for high system reliability, video ingestion and real-time processing are subject to network bandwidth, on-premise hardware health, and scheduled maintenance.
          </p>
        </section>
      </div>
    </article>
  );
}

export default TermsView;
