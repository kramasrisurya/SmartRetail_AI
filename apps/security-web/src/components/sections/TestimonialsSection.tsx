'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { Container } from '../ui/Container';
import { SectionHeader } from '../ui/SectionHeader';
import { testimonialsData } from '../../data/testimonials';
import { Quote, Star, ChevronLeft, ChevronRight, CheckCircle2, Shield } from 'lucide-react';

export const TestimonialsSection: React.FC = () => {
  const [current, setCurrent] = useState(0);

  const next = () => setCurrent((prev) => (prev + 1) % testimonialsData.length);
  const prev = () => setCurrent((prev) => (prev - 1 + testimonialsData.length) % testimonialsData.length);

  const item = testimonialsData[current];

  return (
    <section id="testimonials" className="py-20 sm:py-24 bg-slate-50 relative border-b border-slate-200/80 overflow-hidden">
      <Container>
        {/* Header */}
        <SectionHeader
          eyebrow="Verified Client Deployments"
          title="Trusted by Critical National Infrastructure & Fortune 500 Enterprises"
          description="Read how national airports, commercial bank chains, metro rail networks, and petrochemical plants safeguard their operations with Aegis."
        />

        {/* Carousel Card Container */}
        <div className="max-w-4xl mx-auto mt-10">
          <div className="relative bg-white rounded-3xl border border-slate-200/90 p-8 sm:p-12 shadow-card">
            {/* Top Row: Quote Icon & Stars */}
            <div className="flex items-center justify-between mb-6">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 text-secondary flex items-center justify-center">
                <Quote className="w-6 h-6" />
              </div>
              <div className="flex items-center gap-1 text-amber-400">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} className="w-4 h-4 fill-amber-400" />
                ))}
              </div>
            </div>

            {/* Testimonial Quote with Animation */}
            <AnimatePresence mode="wait">
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
                className="space-y-6"
              >
                <p className="text-base sm:text-xl font-medium text-slate-800 leading-relaxed italic">
                  "{item.quote}"
                </p>

                {/* Project Scope Badge */}
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-100 border border-slate-200 text-xs font-semibold text-slate-700">
                  <Shield className="w-3.5 h-3.5 text-secondary" />
                  <span>Deployment Scope: {item.projectScope}</span>
                </div>

                {/* Author Info */}
                <div className="pt-6 border-t border-slate-100 flex items-center justify-between flex-wrap gap-4">
                  <div className="flex items-center gap-3.5">
                    <div className="relative w-12 h-12 rounded-full overflow-hidden bg-slate-200 border-2 border-white shadow-sm">
                      <Image src={item.avatar} alt={item.author} fill className="object-cover" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 leading-tight">
                        {item.author}
                      </h4>
                      <p className="text-xs text-slate-500">
                        {item.role}, <strong className="text-slate-700">{item.company}</strong>
                      </p>
                      <p className="text-[11px] text-slate-400">{item.location}</p>
                    </div>
                  </div>

                  {/* Navigation Arrows */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={prev}
                      className="p-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors"
                      aria-label="Previous review"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                      onClick={next}
                      className="p-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors"
                      aria-label="Next review"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Dots Indicator */}
          <div className="flex justify-center items-center gap-2 mt-6">
            {testimonialsData.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrent(i)}
                className={`h-2 rounded-full transition-all ${
                  current === i ? 'w-6 bg-secondary' : 'w-2 bg-slate-300'
                }`}
                aria-label={`View testimonial ${i + 1}`}
              />
            ))}
          </div>
        </div>
      </Container>
    </section>
  );
};
