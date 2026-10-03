'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { Container } from '../ui/Container';
import { SectionHeader } from '../ui/SectionHeader';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Modal } from '../ui/Modal';
import { certificationsData } from '../../data/certifications';
import { Certification } from '../../types';
import {
  Award,
  BookOpen,
  CheckCircle2,
  Clock,
  GraduationCap,
  ArrowRight,
  Shield,
  Layers,
} from 'lucide-react';

export const CertificationsSection: React.FC = () => {
  const [selectedCert, setSelectedCert] = useState<Certification | null>(null);

  return (
    <section
      id="certifications"
      className="py-20 sm:py-24 bg-navy-950 text-white relative overflow-hidden border-b border-slate-800"
    >
      {/* Subtle Background Glow Elements */}
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-secondary/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-accent/10 rounded-full blur-3xl pointer-events-none" />

      <Container className="relative z-10">
        {/* Section Header with Dark Theme */}
        <SectionHeader
          eyebrow="Aegis Certification Academy (ACE)"
          title="Industry-Standard Technical Certifications for System Integrators"
          description="Master high-definition IP camera networking, VMS clustering, multi-biometric access calibration, and city-scale command center architecture."
          theme="dark"
        />

        {/* 3 Tier Certification Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-12">
          {certificationsData.map((cert, idx) => (
            <motion.div
              key={cert.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: idx * 0.12 }}
              className="bg-navy-900/80 backdrop-blur-md rounded-2xl border border-slate-800 p-6 flex flex-col justify-between hover:border-cyan-500/50 hover:shadow-glow-blue transition-all duration-300"
            >
              <div className="space-y-4">
                {/* Header & Badges */}
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-cyan-400 tracking-wider">
                    {cert.code}
                  </span>
                  <Badge
                    variant={
                      cert.level === 'Expert'
                        ? 'accent'
                        : cert.level === 'Professional'
                        ? 'secondary'
                        : 'success'
                    }
                    size="sm"
                  >
                    {cert.level} Level
                  </Badge>
                </div>

                {/* Title */}
                <h3 className="text-lg font-bold font-heading text-white leading-snug">
                  {cert.title}
                </h3>

                {/* Duration */}
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <Clock className="w-3.5 h-3.5 text-secondary" />
                  <span>{cert.duration}</span>
                </div>

                {/* Description */}
                <p className="text-xs text-slate-300 leading-relaxed">
                  {cert.description}
                </p>

                {/* Syllabus Highlights */}
                <div className="space-y-1.5 pt-2 border-t border-slate-800">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                    Core Curriculum:
                  </span>
                  {cert.highlights.map((h, i) => (
                    <div key={i} className="flex items-start gap-2 text-xs text-slate-300">
                      <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400 shrink-0 mt-0.5" />
                      <span>{h}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Bottom Action */}
              <div className="pt-6 mt-6 border-t border-slate-800 flex items-center justify-between">
                <span className="font-mono text-[11px] text-slate-500">{cert.examCode}</span>
                <button
                  onClick={() => setSelectedCert(cert)}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-cyan-400 hover:text-cyan-300 transition-colors"
                >
                  <span>View Lab Details</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Training Benefits Banner */}
        <div className="mt-12 p-6 rounded-2xl bg-navy-850/80 border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-4 text-center sm:text-left">
            <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center shrink-0">
              <GraduationCap className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-base font-bold text-white">
                Become an Official Aegis Certified Solution Partner
              </h4>
              <p className="text-xs text-slate-400">
                Certified SI partners gain direct project registration discounts, Level-3 engineering desk access, and priority demo kit allocations.
              </p>
            </div>
          </div>
          <Button
            variant="accent"
            size="md"
            className="shrink-0"
            onClick={() => setSelectedCert(certificationsData[0])}
          >
            Apply for SI Accreditation
          </Button>
        </div>
      </Container>

      {/* Certification Detail Modal */}
      {selectedCert && (
        <Modal
          isOpen={!!selectedCert}
          onClose={() => setSelectedCert(null)}
          title={`${selectedCert.code}: ${selectedCert.title}`}
          maxWidth="lg"
        >
          <div className="p-6 space-y-5">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="secondary" size="md">{selectedCert.level} Level</Badge>
                <span className="text-xs font-mono text-slate-500">Exam: {selectedCert.examCode}</span>
              </div>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                {selectedCert.description}
              </p>
            </div>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs space-y-2">
              <div className="flex justify-between">
                <span className="font-bold text-slate-700">Course Duration:</span>
                <span className="text-slate-900 font-semibold">{selectedCert.duration}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-bold text-slate-700">Target Candidates:</span>
                <span className="text-slate-900 text-right">{selectedCert.targetAudience}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-bold text-slate-700">Format:</span>
                <span className="text-slate-900 font-semibold">Instructor-Led Practical Hands-On Lab</span>
              </div>
            </div>

            <div>
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2">
                Practical Exam Competencies:
              </h4>
              <ul className="space-y-1.5 text-xs text-slate-600">
                {selectedCert.highlights.map((h, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span>{h}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="pt-2">
              <Button
                variant="secondary"
                size="md"
                className="w-full"
                onClick={() => {
                  setSelectedCert(null);
                  alert('Training registration portal request submitted. An academic coordinator will contact your organization.');
                }}
              >
                Register for Upcoming Batch
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </section>
  );
};
