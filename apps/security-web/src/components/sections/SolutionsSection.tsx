'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { Container } from '../ui/Container';
import { SectionHeader } from '../ui/SectionHeader';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { solutionsData } from '../../data/solutions';
import { Solution } from '../../types';
import {
  Car,
  GraduationCap,
  Building2,
  Activity,
  Factory,
  Train,
  ShieldCheck,
  ShoppingBag,
  Hotel,
  Gem,
  Landmark,
  Zap,
  ArrowRight,
  CheckCircle2,
  TrendingUp,
} from 'lucide-react';

interface SolutionsSectionProps {
  onOpenQuote: () => void;
}

export const SolutionsSection: React.FC<SolutionsSectionProps> = ({ onOpenQuote }) => {
  const [selectedSolution, setSelectedSolution] = useState<Solution | null>(null);

  const iconMap: Record<string, React.ReactNode> = {
    Car: <Car className="w-6 h-6" />,
    GraduationCap: <GraduationCap className="w-6 h-6" />,
    Building2: <Building2 className="w-6 h-6" />,
    Activity: <Activity className="w-6 h-6" />,
    Factory: <Factory className="w-6 h-6" />,
    Train: <Train className="w-6 h-6" />,
    ShieldCheck: <ShieldCheck className="w-6 h-6" />,
    ShoppingBag: <ShoppingBag className="w-6 h-6" />,
    Hotel: <Hotel className="w-6 h-6" />,
    Gem: <Gem className="w-6 h-6" />,
    Landmark: <Landmark className="w-6 h-6" />,
    Zap: <Zap className="w-6 h-6" />,
  };

  return (
    <section id="solutions" className="py-20 sm:py-24 bg-slate-50 relative border-b border-slate-200/80">
      <Container>
        {/* Header */}
        <SectionHeader
          eyebrow="Vertical Industry Solutions"
          title="Tailored Architectures for Complex Environments"
          description="From smart cities and high-speed railway corridors to sterile hospital ICUs and financial vaults, discover our purpose-built security blueprints."
        />

        {/* Solutions Grid: 4 columns desktop, 2 tablet, 1 mobile */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {solutionsData.map((sol, idx) => (
            <motion.div
              key={sol.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.35, delay: (idx % 4) * 0.08 }}
              onClick={() => setSelectedSolution(sol)}
              className="group bg-white rounded-2xl border border-slate-200/90 p-5 shadow-card hover:shadow-card-hover hover:-translate-y-1.5 hover:border-secondary/50 transition-all duration-300 cursor-pointer flex flex-col justify-between"
            >
              <div className="space-y-4">
                {/* Icon & Category */}
                <div className="flex items-center justify-between">
                  <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-100 text-secondary group-hover:bg-secondary group-hover:text-white transition-colors flex items-center justify-center">
                    {iconMap[sol.iconName] || <ShieldCheck className="w-6 h-6" />}
                  </div>
                  <span className="text-[10px] font-bold text-accent uppercase tracking-wider bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                    {sol.category}
                  </span>
                </div>

                {/* Title */}
                <h3 className="text-base font-bold text-slate-900 group-hover:text-secondary transition-colors leading-snug">
                  {sol.title}
                </h3>

                {/* Short Description */}
                <p className="text-xs text-slate-600 line-clamp-3 leading-relaxed">
                  {sol.shortDescription}
                </p>
              </div>

              {/* Metric Badge & Link */}
              <div className="pt-4 border-t border-slate-100 mt-4 flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-[11px] text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded">
                  <TrendingUp className="w-3 h-3" />
                  <span>{sol.stats.value} {sol.stats.label}</span>
                </div>
                <span className="text-xs font-bold text-secondary group-hover:translate-x-1 transition-transform flex items-center gap-1">
                  <span>Explore</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </span>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Center CTA */}
        <div className="mt-14 text-center">
          <Button
            variant="secondary"
            size="lg"
            rightIcon={<ArrowRight className="w-4 h-4" />}
            onClick={onOpenQuote}
          >
            Request Custom Solution Architecture Blueprint
          </Button>
        </div>
      </Container>

      {/* Solution Detail Modal */}
      {selectedSolution && (
        <Modal
          isOpen={!!selectedSolution}
          onClose={() => setSelectedSolution(null)}
          title={selectedSolution.title}
          maxWidth="4xl"
        >
          <div className="grid grid-cols-1 md:grid-cols-2">
            <div className="relative h-64 md:h-full w-full bg-slate-900">
              <Image
                src={selectedSolution.image}
                alt={selectedSolution.title}
                fill
                className="object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-navy-950/80 to-transparent" />
              <div className="absolute bottom-4 left-4 right-4 text-white">
                <span className="text-xs font-bold text-cyan-300 uppercase tracking-wider block">
                  {selectedSolution.category} Blueprint
                </span>
                <div className="text-xl font-bold font-heading mt-1">
                  {selectedSolution.stats.value} {selectedSolution.stats.label}
                </div>
              </div>
            </div>

            <div className="p-6 sm:p-8 space-y-5">
              <div>
                <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider">
                  Operational Overview
                </h4>
                <p className="text-xs sm:text-sm text-slate-700 leading-relaxed mt-2">
                  {selectedSolution.fullDescription}
                </p>
              </div>

              <div>
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2">
                  Core Architectural Benefits:
                </h4>
                <ul className="space-y-1.5 text-xs text-slate-600">
                  {selectedSolution.keyBenefits.map((b, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2">
                  Recommended Hardware Ecosystem:
                </h4>
                <div className="flex flex-wrap gap-1.5">
                  {selectedSolution.recommendedProducts.map((prod, i) => (
                    <span
                      key={i}
                      className="text-[11px] font-medium bg-slate-100 text-slate-800 px-2.5 py-1 rounded-md border border-slate-200"
                    >
                      {prod}
                    </span>
                  ))}
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100">
                <Button
                  variant="secondary"
                  size="md"
                  className="w-full"
                  rightIcon={<ArrowRight className="w-4 h-4" />}
                  onClick={() => {
                    setSelectedSolution(null);
                    onOpenQuote();
                  }}
                >
                  Consult an Industry Architect
                </Button>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </section>
  );
};
