import React from "react";
import { ArrowLeft } from "lucide-react";

interface TermsViewProps {
  onBack?: () => void;
}

export function TermsView({ onBack }: TermsViewProps) {
  return (
    <article className="max-w-2xl mx-auto py-6 space-y-6 text-foreground text-[13px] leading-relaxed">
      {/* Header */}
      <div className="border-b border-border pb-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-foreground">Terms of service</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Last updated: October 2026</p>
        </div>
        {onBack && (
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-[6px] border border-border text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back</span>
          </button>
        )}
      </div>

      {/* Draft notice */}
      <div className="p-3 rounded-[6px] border border-border bg-muted/40 text-xs text-muted-foreground">
        Note: This is a placeholder terms document for operational testing and internal review. It should be replaced with vetted commercial terms prior to production deployment.
      </div>

      {/* Terms Body */}
      <div className="space-y-4">
        <section className="space-y-2">
          <h2 className="text-sm font-semibold text-foreground">1. Acceptance of terms</h2>
          <p className="text-muted-foreground">
            By logging into or accessing the StoreSight dashboard, you agree to comply with these terms, your organization's internal acceptable use policies, and applicable local surveillance regulations.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-sm font-semibold text-foreground">2. Operator responsibilities</h2>
          <p className="text-muted-foreground">
            Authorized operators must protect their account credentials and only inspect video streams and customer events in the course of their assigned duties. Exporting, screen recording, or distributing footage outside authorized channels is strictly prohibited.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-sm font-semibold text-foreground">3. System recommendations and human review</h2>
          <p className="text-muted-foreground">
            StoreSight generates automated notifications based on heuristic vision rules. Alerts represent probabilistic indicators, not definitive determinations of theft or wrongdoing. A trained operator must verify evidence before initiating any customer interaction or store escalation.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-sm font-semibold text-foreground">4. System availability and maintenance</h2>
          <p className="text-muted-foreground">
            While we strive for high system reliability, video ingestion and real-time processing are subject to network bandwidth, on-premise hardware health, and scheduled maintenance.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-sm font-semibold text-foreground">5. Termination</h2>
          <p className="text-muted-foreground">
            Access credentials may be revoked at any time by organization administrators upon departure, role transition, or violation of store surveillance guidelines.
          </p>
        </section>
      </div>
    </article>
  );
}

export default TermsView;
