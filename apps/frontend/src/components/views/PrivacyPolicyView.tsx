import React from "react";
import { ArrowLeft } from "lucide-react";

interface PrivacyPolicyViewProps {
  onBack?: () => void;
}

export function PrivacyPolicyView({ onBack }: PrivacyPolicyViewProps) {
  return (
    <article className="max-w-2xl mx-auto py-6 space-y-6 text-foreground text-[13px] leading-relaxed">
      {/* Header */}
      <div className="border-b border-border pb-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-foreground">Privacy policy</h1>
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
        Note: This is a placeholder policy document for store operations and development testing. It should be reviewed and replaced by legal counsel prior to commercial deployment.
      </div>

      {/* Plain text body */}
      <div className="space-y-4">
        <section className="space-y-2">
          <h2 className="text-sm font-semibold text-foreground">1. Overview</h2>
          <p className="text-muted-foreground">
            StoreSight processes video captured by store cameras to monitor queue lengths, detect safety hazards, track foot traffic, and flag suspicious loss patterns. This policy explains what information is collected, how it is handled, and how access is restricted.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-sm font-semibold text-foreground">2. Data collected</h2>
          <p className="text-muted-foreground">
            The platform processes in-store closed-circuit video feeds in real time. We extract spatial coordinates (bounding boxes), trajectory vectors, zone dwell times, and shelf interaction events. We do not maintain a facial recognition database or identify individual customers by name without separate customer-consented systems.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-sm font-semibold text-foreground">3. Retention and access</h2>
          <p className="text-muted-foreground">
            Video recordings are retained according to the retention window configured by the store operator (typically 7 to 30 days), after which unflagged footage is purged. Flagged security incident clips are preserved for operator review and store reporting.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-sm font-semibold text-foreground">4. Access control</h2>
          <p className="text-muted-foreground">
            Access to live cameras and incident reports is restricted by user roles (administrator, security operator, store manager). All login events and alert reviews are recorded in internal audit logs.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-sm font-semibold text-foreground">5. Questions and inquiries</h2>
          <p className="text-muted-foreground">
            Store operators or shoppers with inquiries about surveillance policies may contact their store management or data protection officer.
          </p>
        </section>
      </div>
    </article>
  );
}

export default PrivacyPolicyView;
