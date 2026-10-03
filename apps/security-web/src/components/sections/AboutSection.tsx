'use client';

import React from 'react';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { Container } from '../ui/Container';
import { SectionHeader } from '../ui/SectionHeader';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { CheckCircle2, ArrowRight, ShieldCheck, Award, Factory, Building } from 'lucide-react';

interface AboutSectionProps {
  onOpenQuote: () => void;
}

const keyPillars = [
  { title: 'Committed to Make-in-India', desc: '200,000 sq ft indigenous SMT robotics manufacturing in Mumbai' },
  { title: 'Comprehensive Product Range', desc: '8K PTZ cameras, biometric speed gates, 128ch NVRs, and thermal AI' },
  { title: '12+ Industry Vertical Solutions', desc: 'Customized architectures for airports, banking, smart cities & transit' },
  { title: 'Global Standards & Certifications', desc: 'NDAA-compliant, ISO 9001, ISO 27001, CE, FCC, and RoHS accredited' },
  { title: 'Aegis Certified Training (ACE)', desc: 'Over 15,000 certified system integrators and solution architects' },
  { title: 'Interactive Experience Zones', desc: 'Live hands-on demonstration centers in Mumbai, Delhi, Bengaluru & Hyderabad' },
];

export const AboutSection: React.FC<AboutSectionProps> = ({ onOpenQuote }) => {
  return (
    <section id="about" className="py-20 sm:py-24 bg-slate-50 relative overflow-hidden border-b border-slate-200/80">
      <Container>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
          {/* Left Column: Visual Composition with Overlapping Photos (Spans 5) */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="lg:col-span-5 relative"
          >
            {/* Primary Large Image */}
            <div className="relative h-[380px] sm:h-[440px] w-full rounded-2xl overflow-hidden shadow-2xl border-4 border-white">
              <Image
                src="https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?auto=format&fit=crop&w=1000&q=80"
                alt="Aegis Smart Manufacturing Hub"
                fill
                className="object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-navy-950/80 via-transparent to-transparent" />
              
              <div className="absolute bottom-4 left-4 right-4 text-white">
                <span className="text-[10px] font-bold tracking-widest uppercase text-cyan-300">
                  Indigenous Production
                </span>
                <p className="text-sm font-bold">
                  State-of-the-Art Cleanroom SMT Electronics Facility
                </p>
              </div>
            </div>

            {/* Overlapping Secondary Card (Floating Bottom-Right) */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              whileInView={{ opacity: 1, scale: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="absolute -bottom-8 -right-4 sm:-right-8 w-60 sm:w-68 bg-white p-4 rounded-xl shadow-xl border border-slate-200"
            >
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-xs font-bold text-slate-900 block leading-tight">
                    Make in India
                  </span>
                  <span className="text-[10px] text-slate-500 block">Class-1 Local Supplier</span>
                </div>
              </div>
              <p className="text-[11px] text-slate-600 leading-snug">
                Fulfills strict public procurement safety, domestic value addition, and data localization mandates.
              </p>
            </motion.div>
          </motion.div>

          {/* Right Column: Company Story & Bullet Points (Spans 7) */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="lg:col-span-7 space-y-6"
          >
            <SectionHeader
              eyebrow="About Aegis Security"
              title="Enabling a Smart, Autonomous & Secure Future"
              align="left"
              className="mb-6"
            />

            <div className="space-y-4 text-sm sm:text-base text-slate-600 leading-relaxed">
              <p>
                Aegis Security is a pioneering force in the global video surveillance and physical security industry.
                We engineer full-stack, enterprise-grade security ecosystems—integrating deep-learning optical sensors,
                touchless biometric credentials, long-range perimeter radars, and centralized AI video management software.
              </p>
              <p>
                With sovereign manufacturing infrastructure and dedicated R&D optical labs in India, we deliver
                turnkey security architectures tailored to high-density airports, national rail transit corridors,
                financial banking networks, and industrial manufacturing plants.
              </p>
            </div>

            {/* Pillar Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-2">
              {keyPillars.map((pillar, idx) => (
                <div key={idx} className="flex items-start gap-2.5 p-3 rounded-xl bg-white border border-slate-200/80 shadow-sm">
                  <CheckCircle2 className="w-4 h-4 text-secondary shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 leading-tight">
                      {pillar.title}
                    </h4>
                    <p className="text-[11px] text-slate-500 leading-snug mt-0.5">
                      {pillar.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Action CTAs */}
            <div className="pt-4 flex flex-wrap items-center gap-4">
              <Button
                variant="secondary"
                size="md"
                rightIcon={<ArrowRight className="w-4 h-4" />}
                onClick={onOpenQuote}
              >
                Request Enterprise Consultation
              </Button>
              <a
                href="#certifications"
                className="text-xs sm:text-sm font-semibold text-slate-700 hover:text-secondary flex items-center gap-1.5 transition-colors"
              >
                <span>Explore Training Center (ACE Academy)</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </a>
            </div>
          </motion.div>
        </div>
      </Container>
    </section>
  );
};
