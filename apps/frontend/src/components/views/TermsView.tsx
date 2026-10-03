import React from "react";
import { ArrowLeft, FileCheck, ShieldAlert, Scale, CheckCircle2 } from "lucide-react";

interface TermsViewProps {
  onBack?: () => void;
}

export function TermsView({ onBack }: TermsViewProps) {
  return (
    <article className="max-w-3xl mx-auto py-8 space-y-6 text-foreground text-[14px] leading-relaxed animate-fade-up">
      {/* Header */}
      <div className="border-b border-border pb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Scale className="w-5 h-5 text-primary" aria-hidden="true" />
            <h1 className="text-[22px] font-semibold tracking-tight text-foreground">
              Enterprise Terms of Service
            </h1>
          </div>
          <p className="text-[12px] text-text-tertiary mt-1">
            Effective Date: October 1, 2026 · Retail Operations & Surveillance Software Agreement
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

      {/* Governance Banner */}
      <div className="p-4 rounded-[10px] border border-border bg-surface-elevated flex items-start gap-3">
        <FileCheck className="w-5 h-5 text-primary shrink-0 mt-0.5" />
        <div className="text-[13px] text-text-secondary space-y-1">
          <p className="font-semibold text-foreground">
            Enterprise Authorization & Responsible Operational Use
          </p>
          <p>
            By accessing or operating the StoreSight intelligence console, authorized personnel agree to adhere to
            strict enterprise surveillance ethics, role privileges, and legal loss prevention protocols.
          </p>
        </div>
      </div>

      {/* Body Content */}
      <div className="space-y-6">
        <section className="space-y-2.5">
          <h2 className="text-[16px] font-semibold text-foreground border-b border-border/50 pb-1">
            1. Acceptance and Authorized Scope of Use
          </h2>
          <p className="text-text-secondary">
            This Master Software Service Agreement ("Terms") governs the use of the SmartRetail StoreSight platform
            by your retail organization and its designated users. Access is granted solely to authenticated employees,
            security contractors, and store operations managers who have been issued credentials by an authorized
            Organization Administrator.
          </p>
        </section>

        <section className="space-y-2.5">
          <h2 className="text-[16px] font-semibold text-foreground border-b border-border/50 pb-1">
            2. Mandatory Human-in-the-Loop Verification
          </h2>
          <p className="text-text-secondary">
            StoreSight employs edge computer vision and heuristic inference models to highlight potential security
            incidents, anomalous dwell patterns, and inventory shrinkage events.
          </p>
          <div className="p-3.5 rounded-[8px] border border-amber-500/30 bg-amber-500/10 text-amber-800 dark:text-amber-300 text-[13px] space-y-1">
            <p className="font-semibold flex items-center gap-1.5">
              <ShieldAlert className="w-4 h-4 shrink-0 text-amber-500" />
              Advisory Decision-Support Directive
            </p>
            <p>
              All system alert indicators are probabilistic and intended strictly for decision support. No automated
              disciplinary action, customer detention, or law enforcement reporting may be initiated without
              independent verification and human review by a trained loss prevention operator.
            </p>
          </div>
        </section>

        <section className="space-y-2.5">
          <h2 className="text-[16px] font-semibold text-foreground border-b border-border/50 pb-1">
            3. Operator Responsibilities & Credential Governance
          </h2>
          <p className="text-text-secondary">
            Authorized operators agree to the following operational standards:
          </p>
          <ul className="list-disc pl-5 space-y-1.5 text-text-secondary">
            <li>Keep account credentials confidential and refrain from sharing operator sessions.</li>
            <li>Inspect live camera feeds, floor plans, and video evidence solely in performance of assigned duties.</li>
            <li>
              Never capture unauthorized screen recordings, photos, or mobile copies of video surveillance feeds for
              personal or external dissemination.
            </li>
            <li>Ensure all incident claim notes and triage classifications represent accurate, objective facts.</li>
          </ul>
        </section>

        <section className="space-y-2.5">
          <h2 className="text-[16px] font-semibold text-foreground border-b border-border/50 pb-1">
            4. System Telemetry, Edge governors & Service Levels
          </h2>
          <p className="text-text-secondary">
            StoreSight relies on on-premise edge governors, IP camera hardware health, and local area network
            bandwidth. The service is provided to maintain operational continuity, with video feeds governed by
            automated heartbeat monitoring. Maintenance windows and software updates will be communicated in advance
            via administrative console notifications.
          </p>
        </section>

        <section className="space-y-2.5">
          <h2 className="text-[16px] font-semibold text-foreground border-b border-border/50 pb-1">
            5. Intellectual Property and Confidentiality
          </h2>
          <p className="text-text-secondary">
            All algorithms, computer vision neural pipeline architectures, user interface components, and edge software
            remain the exclusive intellectual property of SmartRetail and its licensors. All store footage, retail floor
            plans, and customer telemetry remain the confidential proprietary data of the store operator.
          </p>
        </section>

        <section className="space-y-2.5">
          <h2 className="text-[16px] font-semibold text-foreground border-b border-border/50 pb-1">
            6. Governing Law and Enterprise Inquiries
          </h2>
          <p className="text-text-secondary">
            These Terms shall be interpreted in accordance with the laws of the jurisdiction in which the physical store
            premises are incorporated, without regard to conflict of law principles.
          </p>
          <p className="text-text-secondary text-[13px] pt-2">
            For operational legal inquiries or enterprise license agreements, contact:{" "}
            <span className="font-mono text-foreground font-medium">legal@smartretail.ai</span>
          </p>
        </section>
      </div>
    </article>
  );
}

export default TermsView;
