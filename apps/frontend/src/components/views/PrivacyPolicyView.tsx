import React from "react";
import { ArrowLeft, Shield, Lock, FileText, CheckCircle2 } from "lucide-react";

interface PrivacyPolicyViewProps {
  onBack?: () => void;
}

export function PrivacyPolicyView({ onBack }: PrivacyPolicyViewProps) {
  return (
    <article className="max-w-3xl mx-auto py-8 space-y-6 text-foreground text-[14px] leading-relaxed animate-fade-up">
      {/* Header */}
      <div className="border-b border-border pb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" aria-hidden="true" />
            <h1 className="text-[22px] font-semibold tracking-tight text-foreground">
              Enterprise Privacy Policy
            </h1>
          </div>
          <p className="text-[12px] text-text-tertiary mt-1">
            Effective Date: October 1, 2026 · Standard Surveillance & Telemetry Governance
          </p>
        </div>
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-[8px] border border-border bg-card text-[13px] font-medium text-text-secondary hover:text-foreground hover:bg-surface-elevated transition shadow-xs self-start sm:self-auto"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Return to Console</span>
          </button>
        )}
      </div>

      {/* Compliance Overview Banner */}
      <div className="p-4 rounded-[10px] border border-border bg-surface-elevated flex items-start gap-3">
        <Lock className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
        <div className="text-[13px] text-text-secondary space-y-1">
          <p className="font-semibold text-foreground">
            Strict Physical Retail Privacy & Surveillance Compliance
          </p>
          <p>
            SmartRetail StoreSight processes closed-circuit television (CCTV) video feeds on on-premise edge
            hardware. The system generates spatial coordinates and heuristic motion telemetry for loss prevention,
            safety auditing, and store operations. No facial recognition or biometric identification databases are created.
          </p>
        </div>
      </div>

      {/* Body Content */}
      <div className="space-y-6">
        <section className="space-y-2.5">
          <h2 className="text-[16px] font-semibold text-foreground border-b border-border/50 pb-1">
            1. Scope and Identity of Data Controller
          </h2>
          <p className="text-text-secondary">
            This Policy applies to the StoreSight AI retail surveillance, loss prevention, and spatial telemetry
            platform deployed across participating retail store locations. The individual retail enterprise operating
            the physical premises acts as the Data Controller with respect to all in-store video surveillance and
            operational logs. SmartRetail acts as the technology vendor and processor operating under strict data
            processing agreements.
          </p>
        </section>

        <section className="space-y-2.5">
          <h2 className="text-[16px] font-semibold text-foreground border-b border-border/50 pb-1">
            2. Categories of Information Processed
          </h2>
          <p className="text-text-secondary">
            The platform processes the following operational categories in real time:
          </p>
          <ul className="list-disc pl-5 space-y-1.5 text-text-secondary">
            <li>
              <strong className="text-foreground">In-Store CCTV Video Streams:</strong> High-definition video
              captured from ceiling-mounted and perimeter surveillance cameras overlooking public retail aisles,
              converses, checkout counters, and entrance portals.
            </li>
            <li>
              <strong className="text-foreground">Spatial Bounding Coordinates:</strong> Real-time bounding box
              coordinates, velocity vectors, and zone dwell durations extracted via edge neural object detection.
            </li>
            <li>
              <strong className="text-foreground">Inventory & POS Correlation Data:</strong> Point-of-sale transaction
              timestamps and RFID shelf sensor counts correlated with spatial presence to detect shrinkage anomalies.
            </li>
            <li>
              <strong className="text-foreground">Operator Audit Logs:</strong> Cryptographic access timestamps,
              operator user IDs, alert claim actions, and clip export records to guarantee accountability.
            </li>
          </ul>
          <p className="text-text-secondary font-medium">
            Explicit Exclusion: StoreSight does not perform facial recognition, iris scanning, biometric fingerprinting,
            or automated demographic profiling of shoppers.
          </p>
        </section>

        <section className="space-y-2.5">
          <h2 className="text-[16px] font-semibold text-foreground border-b border-border/50 pb-1">
            3. Legal Grounds for Processing
          </h2>
          <p className="text-text-secondary">
            Surveillance footage and edge telemetry are processed under legitimate business interests, including:
          </p>
          <ul className="list-disc pl-5 space-y-1.5 text-text-secondary">
            <li>Preventing theft, organized retail crime, and unauthorized backroom access.</li>
            <li>Investigating slip-and-fall incidents, worker safety hazards, and physical emergencies.</li>
            <li>Optimizing checkout queue staffing, aisle congestion, and store ergonomics.</li>
          </ul>
          <p className="text-text-secondary">
            Prominent physical signage is placed at all store entry points notifying visitors and employees of active
            video recording and electronic surveillance in accordance with applicable local, state, and federal law.
          </p>
        </section>

        <section className="space-y-2.5">
          <h2 className="text-[16px] font-semibold text-foreground border-b border-border/50 pb-1">
            4. Data Retention and Automated Purge Schedules
          </h2>
          <p className="text-text-secondary">
            To prevent excessive data retention, StoreSight employs automated rolling deletion schedules:
          </p>
          <ul className="list-disc pl-5 space-y-1.5 text-text-secondary">
            <li>
              <strong className="text-foreground">Standard Surveillance Footage:</strong> Routine unflagged video
              recordings are stored on local network video recorder (NVR) ring buffers and automatically overwritten
              after 14 to 30 days (as configured by store policy).
            </li>
            <li>
              <strong className="text-foreground">Flagged Incident Evidence:</strong> Video segments associated with
              formally confirmed loss events, law enforcement inquiries, or liability claims are encrypted and retained
              only for the duration required by applicable statutory limitation periods.
            </li>
          </ul>
        </section>

        <section className="space-y-2.5">
          <h2 className="text-[16px] font-semibold text-foreground border-b border-border/50 pb-1">
            5. Access Governance & Information Security
          </h2>
          <p className="text-text-secondary">
            Access to live cameras and incident evidence is governed by strict Role-Based Access Control (RBAC):
          </p>
          <ul className="list-disc pl-5 space-y-1.5 text-text-secondary">
            <li>Role separation: Administrator, Security Operator, and Store Manager.</li>
            <li>All video streams in-transit are encrypted using TLS 1.3; archived clips use AES-256.</li>
            <li>Non-repudiation: Every stream review, still capture, and evidence export is logged to an immutable audit trail.</li>
          </ul>
        </section>

        <section className="space-y-2.5">
          <h2 className="text-[16px] font-semibold text-foreground border-b border-border/50 pb-1">
            6. Regulatory Inquiries and Data Subject Rights
          </h2>
          <p className="text-text-secondary">
            Individuals visiting retail store locations may have rights under applicable privacy legislation (such as
            GDPR, CCPA, or regional surveillance acts) regarding video footage in which they appear. Requests for
            footage inspection or data handling inquiries must be submitted directly to the store operator's Data
            Protection Officer (DPO) with exact date, time, and store location specifications.
          </p>
          <p className="text-text-secondary text-[13px] pt-2">
            Inquiries regarding platform compliance may be directed to: <span className="font-mono text-foreground font-medium">privacy@smartretail.ai</span>
          </p>
        </section>
      </div>
    </article>
  );
}

export default PrivacyPolicyView;
