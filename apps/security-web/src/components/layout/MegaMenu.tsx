'use client';

import React from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, ArrowUpRight } from 'lucide-react';
import { MegaMenuCategory } from '../../types';
import { Badge } from '../ui/Badge';

interface MegaMenuProps {
  isOpen: boolean;
  categories: MegaMenuCategory[];
  viewAllLink: string;
  viewAllText: string;
  onClose: () => void;
  onSelectProduct?: (name: string) => void;
}

export const MegaMenu: React.FC<MegaMenuProps> = ({
  isOpen,
  categories,
  viewAllLink,
  viewAllText,
  onClose,
}) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 6 }}
          transition={{ duration: 0.18, ease: 'easeOut' }}
          className="absolute top-full left-0 w-full bg-white/95 backdrop-blur-xl border-t border-slate-200 shadow-2xl z-40"
          onMouseLeave={onClose}
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              {categories.map((col, idx) => (
                <div key={idx} className="flex flex-col space-y-4">
                  {/* Category Heading */}
                  <div className="border-b border-slate-100 pb-2">
                    <h4 className="text-sm font-bold uppercase tracking-wider text-slate-900 flex items-center justify-between">
                      <span>{col.title}</span>
                    </h4>
                    {col.description && (
                      <p className="text-xs text-slate-500 mt-0.5">{col.description}</p>
                    )}
                  </div>

                  {/* Featured Product Card if exists */}
                  {col.featuredProduct && (
                    <a
                      href={col.featuredProduct.link}
                      onClick={onClose}
                      className="group block relative rounded-xl overflow-hidden border border-slate-100 bg-slate-50 p-2.5 hover:border-blue-200 transition-all shadow-sm"
                    >
                      <div className="relative h-28 w-full rounded-lg overflow-hidden bg-slate-200 mb-2">
                        <Image
                          src={col.featuredProduct.image}
                          alt={col.featuredProduct.name}
                          fill
                          className="object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        <span className="absolute top-2 left-2 bg-primary/90 text-white text-[10px] font-bold px-2 py-0.5 rounded-full backdrop-blur-sm">
                          {col.featuredProduct.tag}
                        </span>
                      </div>
                      <p className="text-xs font-bold text-slate-900 group-hover:text-secondary line-clamp-1 flex items-center justify-between">
                        <span>{col.featuredProduct.name}</span>
                        <ArrowUpRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </p>
                    </a>
                  )}

                  {/* Links List */}
                  <ul className="space-y-2.5">
                    {col.links.map((link, lIdx) => (
                      <li key={lIdx}>
                        <a
                          href={link.href}
                          onClick={onClose}
                          className="group flex items-start justify-between text-xs py-1 px-2 rounded-md hover:bg-slate-50 transition-colors"
                        >
                          <div className="flex-1 pr-2">
                            <span className="font-semibold text-slate-800 group-hover:text-secondary transition-colors block">
                              {link.name}
                            </span>
                            <span className="text-[11px] text-slate-500 block leading-tight mt-0.5">
                              {link.description}
                            </span>
                          </div>
                          {link.badge && (
                            <Badge variant="secondary" size="sm" className="shrink-0 mt-0.5">
                              {link.badge}
                            </Badge>
                          )}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>

            {/* Bottom Bar: View All Links & Quick Help */}
            <div className="mt-8 pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-4 text-xs">
              <div className="flex items-center gap-6 text-slate-600">
                <span className="font-semibold text-slate-900">Need Technical Consultation?</span>
                <span>Talk with an enterprise architect: 1800-209-9999</span>
              </div>
              <a
                href={viewAllLink}
                onClick={onClose}
                className="inline-flex items-center gap-1.5 font-bold text-secondary hover:text-secondary-hover transition-colors"
              >
                <span>{viewAllText}</span>
                <ChevronRight className="w-4 h-4" />
              </a>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
