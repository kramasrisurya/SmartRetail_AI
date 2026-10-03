'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronDown, Phone, Mail, Shield, ArrowRight, Heart, BarChart2 } from 'lucide-react';
import { productsMegaMenu, solutionsMegaMenu } from '../../data/megaMenuData';
import { Button } from '../ui/Button';
import { useStore } from '../../store/useStore';

interface MobileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenQuote: () => void;
}

export const MobileDrawer: React.FC<MobileDrawerProps> = ({
  isOpen,
  onClose,
  onOpenQuote,
}) => {
  const [openAccordion, setOpenAccordion] = useState<string | null>('products');
  const { wishlist, compareList, setWishlistOpen, setCompareOpen } = useStore();

  const toggleAccordion = (name: string) => {
    setOpenAccordion(openAccordion === name ? null : name);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex justify-end" role="dialog" aria-modal="true">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-navy-950/70 backdrop-blur-sm"
          />

          {/* Drawer Panel */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 280 }}
            className="relative w-full max-w-sm bg-white h-full shadow-2xl z-10 flex flex-col justify-between overflow-y-auto"
          >
            {/* Drawer Header */}
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-white font-bold text-lg">
                  A
                </div>
                <div>
                  <span className="font-bold text-slate-900 tracking-tight block text-sm">AEGIS SECURITY</span>
                  <span className="text-[10px] text-secondary font-medium tracking-widest uppercase block -mt-0.5">Enterprise Systems</span>
                </div>
              </div>
              <button
                onClick={onClose}
                className="text-slate-400 hover:text-slate-700 p-2 rounded-lg hover:bg-slate-100"
                aria-label="Close navigation"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Actions Strip */}
            <div className="grid grid-cols-2 gap-2 p-3 bg-slate-100/70 border-b border-slate-200/80">
              <button
                onClick={() => {
                  onClose();
                  setWishlistOpen(true);
                }}
                className="flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-white border border-slate-200 text-xs font-semibold text-slate-800 shadow-sm"
              >
                <Heart className="w-4 h-4 text-rose-500" />
                <span>Saved ({wishlist.length})</span>
              </button>
              <button
                onClick={() => {
                  onClose();
                  setCompareOpen(true);
                }}
                className="flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-white border border-slate-200 text-xs font-semibold text-slate-800 shadow-sm"
              >
                <BarChart2 className="w-4 h-4 text-secondary" />
                <span>Compare ({compareList.length})</span>
              </button>
            </div>

            {/* Nav Links / Accordions */}
            <div className="p-4 space-y-1 flex-1 overflow-y-auto">
              {/* Products Accordion */}
              <div className="border-b border-slate-100 pb-2">
                <button
                  onClick={() => toggleAccordion('products')}
                  className="w-full py-2.5 flex items-center justify-between text-sm font-bold text-slate-900"
                >
                  <span>Products Catalog</span>
                  <ChevronDown
                    className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${
                      openAccordion === 'products' ? 'rotate-180 text-secondary' : ''
                    }`}
                  />
                </button>
                {openAccordion === 'products' && (
                  <div className="pl-3 py-2 space-y-3">
                    {productsMegaMenu.map((cat, idx) => (
                      <div key={idx} className="space-y-1">
                        <span className="text-xs font-bold text-secondary uppercase tracking-wider block">
                          {cat.title}
                        </span>
                        {cat.links.map((link, lIdx) => (
                          <a
                            key={lIdx}
                            href={link.href}
                            onClick={onClose}
                            className="block text-xs text-slate-600 hover:text-secondary py-1"
                          >
                            • {link.name}
                          </a>
                        ))}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Solutions Accordion */}
              <div className="border-b border-slate-100 pb-2">
                <button
                  onClick={() => toggleAccordion('solutions')}
                  className="w-full py-2.5 flex items-center justify-between text-sm font-bold text-slate-900"
                >
                  <span>Vertical Solutions</span>
                  <ChevronDown
                    className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${
                      openAccordion === 'solutions' ? 'rotate-180 text-secondary' : ''
                    }`}
                  />
                </button>
                {openAccordion === 'solutions' && (
                  <div className="pl-3 py-2 space-y-3">
                    {solutionsMegaMenu.map((cat, idx) => (
                      <div key={idx} className="space-y-1">
                        <span className="text-xs font-bold text-secondary uppercase tracking-wider block">
                          {cat.title}
                        </span>
                        {cat.links.map((link, lIdx) => (
                          <a
                            key={lIdx}
                            href={link.href}
                            onClick={onClose}
                            className="block text-xs text-slate-600 hover:text-secondary py-1"
                          >
                            • {link.name}
                          </a>
                        ))}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Static Links */}
              <a
                href="#about"
                onClick={onClose}
                className="block py-2.5 text-sm font-semibold text-slate-800 hover:text-secondary border-b border-slate-100"
              >
                About Aegis
              </a>
              <a
                href="#certifications"
                onClick={onClose}
                className="block py-2.5 text-sm font-semibold text-slate-800 hover:text-secondary border-b border-slate-100"
              >
                Certification Training (ACE)
              </a>
              <a
                href="#blog"
                onClick={onClose}
                className="block py-2.5 text-sm font-semibold text-slate-800 hover:text-secondary border-b border-slate-100"
              >
                News & Press Releases
              </a>
              <a
                href="#testimonials"
                onClick={onClose}
                className="block py-2.5 text-sm font-semibold text-slate-800 hover:text-secondary border-b border-slate-100"
              >
                Client Case Studies
              </a>
              <a
                href="#support"
                onClick={onClose}
                className="block py-2.5 text-sm font-semibold text-slate-800 hover:text-secondary border-b border-slate-100"
              >
                Service & Technical Support
              </a>
            </div>

            {/* Bottom Drawer Actions */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 space-y-3">
              <Button
                variant="secondary"
                size="md"
                className="w-full"
                rightIcon={<ArrowRight className="w-4 h-4" />}
                onClick={() => {
                  onClose();
                  onOpenQuote();
                }}
              >
                Get Enterprise Quote
              </Button>

              <div className="pt-2 text-xs text-slate-500 space-y-1.5">
                <div className="flex items-center gap-2">
                  <Phone className="w-3.5 h-3.5 text-secondary" />
                  <span className="font-semibold text-slate-700">Toll-Free: 1800-209-9999</span>
                </div>
                <div className="flex items-center gap-2">
                  <Mail className="w-3.5 h-3.5 text-secondary" />
                  <span>sales@aegis-security.com</span>
                </div>
                <div className="flex items-center gap-1.5 text-[11px] text-amber-700 pt-1">
                  <Shield className="w-3.5 h-3.5 text-amber-500" />
                  <span>Make in India Enterprise Approved</span>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
