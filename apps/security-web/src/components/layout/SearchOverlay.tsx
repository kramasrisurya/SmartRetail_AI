'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, ArrowRight, ShieldCheck, Camera, Cpu, Layers } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { productsData } from '../../data/products';
import { solutionsData } from '../../data/solutions';
import { Badge } from '../ui/Badge';

export const SearchOverlay: React.FC = () => {
  const { isSearchOpen, setSearchOpen, openQuickview } = useStore();
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isSearchOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
      setQuery('');
    }
  }, [isSearchOpen]);

  const filteredProducts = useMemo(() => {
    if (!query.trim()) return productsData.slice(0, 4);
    const q = query.toLowerCase();
    return productsData.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.model.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q) ||
        p.shortDescription.toLowerCase().includes(q) ||
        p.specs.aiFeatures?.some((f) => f.toLowerCase().includes(q))
    );
  }, [query]);

  const filteredSolutions = useMemo(() => {
    if (!query.trim()) return solutionsData.slice(0, 3);
    const q = query.toLowerCase();
    return solutionsData.filter(
      (s) =>
        s.title.toLowerCase().includes(q) ||
        s.category.toLowerCase().includes(q) ||
        s.shortDescription.toLowerCase().includes(q)
    );
  }, [query]);

  if (!isSearchOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 px-4 pb-6" role="dialog" aria-modal="true">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => setSearchOpen(false)}
          className="fixed inset-0 bg-navy-950/80 backdrop-blur-md"
        />

        {/* Search Modal Panel */}
        <motion.div
          initial={{ opacity: 0, y: -20, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.98 }}
          transition={{ duration: 0.2 }}
          className="relative w-full max-w-3xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden z-10 flex flex-col max-h-[80vh]"
        >
          {/* Input Header */}
          <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center gap-3 bg-slate-50/70">
            <Search className="w-6 h-6 text-secondary shrink-0" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by model (e.g. AE-PTZ8836), AI features, resolution, or solution..."
              className="w-full bg-transparent text-base sm:text-lg font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none"
            />
            {query && (
              <button
                onClick={() => setQuery('')}
                className="text-slate-400 hover:text-slate-700 text-xs font-semibold px-2 py-1 bg-slate-200/60 rounded"
              >
                Clear
              </button>
            )}
            <button
              onClick={() => setSearchOpen(false)}
              className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-200/50"
              aria-label="Close search"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Quick Filters / Tags */}
          <div className="px-5 py-2.5 bg-slate-100/60 border-b border-slate-200/70 flex items-center gap-2 overflow-x-auto text-xs">
            <span className="text-slate-500 font-medium shrink-0">Popular:</span>
            {['8K PTZ', 'AcuSense', 'Face Terminal', 'Smart City', 'Thermal Fire', 'NVR 128ch'].map((tag) => (
              <button
                key={tag}
                onClick={() => setQuery(tag)}
                className="px-2.5 py-1 rounded-full bg-white border border-slate-200 text-slate-700 hover:border-secondary hover:text-secondary whitespace-nowrap transition-colors"
              >
                {tag}
              </button>
            ))}
          </div>

          {/* Search Results Area */}
          <div className="p-5 overflow-y-auto space-y-6">
            {/* Products Group */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Camera className="w-3.5 h-3.5 text-secondary" />
                  Products ({filteredProducts.length})
                </span>
                <a
                  href="#products"
                  onClick={() => setSearchOpen(false)}
                  className="text-xs text-secondary font-semibold hover:underline"
                >
                  View full catalog
                </a>
              </div>

              {filteredProducts.length === 0 ? (
                <p className="text-xs text-slate-500 py-3 italic">No matching products found for "{query}".</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {filteredProducts.map((p) => (
                    <div
                      key={p.id}
                      onClick={() => {
                        openQuickview(p);
                        setSearchOpen(false);
                      }}
                      className="group flex items-center gap-3 p-3 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-blue-50/40 hover:border-blue-200 cursor-pointer transition-all"
                    >
                      <div className="relative w-14 h-14 rounded-lg bg-white border border-slate-200 overflow-hidden shrink-0">
                        <Image src={p.image} alt={p.name} fill className="object-cover" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="text-[10px] font-bold text-secondary tracking-wider block">
                          {p.model}
                        </span>
                        <h5 className="text-xs font-bold text-slate-900 truncate group-hover:text-secondary">
                          {p.name}
                        </h5>
                        <p className="text-[11px] text-slate-500 truncate mt-0.5">{p.shortDescription}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Solutions Group */}
            <div className="pt-2 border-t border-slate-100">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5 mb-3">
                <Layers className="w-3.5 h-3.5 text-accent" />
                Industry Solutions ({filteredSolutions.length})
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {filteredSolutions.map((s) => (
                  <a
                    key={s.id}
                    href={`#solutions`}
                    onClick={() => setSearchOpen(false)}
                    className="group block p-3 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-slate-100 hover:border-slate-300 transition-all"
                  >
                    <span className="text-[10px] font-bold text-accent uppercase tracking-wider block">
                      {s.category}
                    </span>
                    <h5 className="text-xs font-bold text-slate-900 mt-1 group-hover:text-secondary flex items-center justify-between">
                      <span className="truncate">{s.title}</span>
                      <ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </h5>
                    <p className="text-[11px] text-slate-500 line-clamp-2 mt-1">{s.shortDescription}</p>
                  </a>
                ))}
              </div>
            </div>
          </div>

          {/* Footer Shortcuts */}
          <div className="p-3 bg-slate-50 border-t border-slate-100 text-[11px] text-slate-500 flex items-center justify-between px-5">
            <span>Press <kbd className="px-1.5 py-0.5 bg-white border border-slate-300 rounded font-mono text-slate-700">ESC</kbd> to exit search</span>
            <span className="flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              Direct Search across 100+ Enterprise Spec Models
            </span>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
