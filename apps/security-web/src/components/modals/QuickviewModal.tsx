'use client';

import React from 'react';
import Image from 'next/image';
import { useStore } from '../../store/useStore';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import {
  Heart,
  BarChart2,
  FileText,
  ShieldCheck,
  Cpu,
  CheckCircle,
  Eye,
} from 'lucide-react';

export const QuickviewModal: React.FC = () => {
  const {
    quickviewProduct,
    closeQuickview,
    wishlist,
    toggleWishlist,
    compareList,
    addToCompare,
    addToQuote,
  } = useStore();

  if (!quickviewProduct) return null;

  const isWishlisted = wishlist.includes(quickviewProduct.id);
  const isCompared = compareList.some((p) => p.id === quickviewProduct.id);

  return (
    <Modal
      isOpen={!!quickviewProduct}
      onClose={closeQuickview}
      maxWidth="4xl"
    >
      <div className="grid grid-cols-1 md:grid-cols-2">
        {/* Left: Product Image & Badges */}
        <div className="p-6 bg-slate-50 flex flex-col justify-between border-b md:border-b-0 md:border-r border-slate-200">
          <div>
            <div className="flex items-center justify-between mb-4">
              <Badge variant="secondary" size="md">
                {quickviewProduct.category}
              </Badge>
              {quickviewProduct.badge && (
                <Badge variant="accent" size="sm">
                  {quickviewProduct.badge}
                </Badge>
              )}
            </div>

            <div className="relative aspect-4/3 w-full rounded-xl overflow-hidden bg-white border border-slate-200 shadow-sm mb-4">
              <Image
                src={quickviewProduct.image}
                alt={quickviewProduct.name}
                fill
                className="object-cover"
              />
            </div>
          </div>

          <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 text-xs text-slate-600 space-y-1.5">
            <div className="flex items-center gap-1.5 font-bold text-slate-900">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Enterprise Grade Verification</span>
            </div>
            <p className="text-[11px] text-slate-500">
              Complies with NDAA, ONVIF Profile S/G/T/M, CE, FCC, and RoHS standards. Includes 3-year enterprise replacement warranty.
            </p>
          </div>
        </div>

        {/* Right: Technical Specs & Actions */}
        <div className="p-6 sm:p-8 flex flex-col justify-between space-y-6">
          <div className="space-y-4">
            <div>
              <span className="text-xs font-mono font-bold text-secondary uppercase tracking-wider block">
                Model: {quickviewProduct.model}
              </span>
              <h3 className="text-xl sm:text-2xl font-bold font-heading text-slate-900 mt-1">
                {quickviewProduct.name}
              </h3>
            </div>

            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              {quickviewProduct.description}
            </p>

            {/* AI Capabilities Pills */}
            {quickviewProduct.specs.aiFeatures && (
              <div>
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-2">
                  Built-In Deep Learning Analytics:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {quickviewProduct.specs.aiFeatures.map((feat, i) => (
                    <span
                      key={i}
                      className="inline-flex items-center gap-1 text-[11px] font-medium bg-blue-50 text-blue-800 border border-blue-200 px-2.5 py-1 rounded-md"
                    >
                      <Cpu className="w-3 h-3 text-secondary" />
                      <span>{feat}</span>
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Spec Matrix */}
            <div className="border-t border-slate-100 pt-3">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-2">
                Key Hardware Specifications:
              </span>
              <div className="grid grid-cols-2 gap-2 text-xs">
                {quickviewProduct.specs.resolution && (
                  <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
                    <span className="text-slate-400 block text-[10px]">Resolution</span>
                    <span className="font-semibold text-slate-800">{quickviewProduct.specs.resolution}</span>
                  </div>
                )}
                {quickviewProduct.specs.sensor && (
                  <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
                    <span className="text-slate-400 block text-[10px]">Image Sensor</span>
                    <span className="font-semibold text-slate-800">{quickviewProduct.specs.sensor}</span>
                  </div>
                )}
                {quickviewProduct.specs.irRange && (
                  <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
                    <span className="text-slate-400 block text-[10px]">IR / Illumination</span>
                    <span className="font-semibold text-slate-800">{quickviewProduct.specs.irRange}</span>
                  </div>
                )}
                {quickviewProduct.specs.protectionRating && (
                  <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
                    <span className="text-slate-400 block text-[10px]">Ingress Protection</span>
                    <span className="font-semibold text-slate-800">{quickviewProduct.specs.protectionRating}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Key Features List */}
            <div>
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                Highlights:
              </span>
              <ul className="space-y-1 text-xs text-slate-600">
                {quickviewProduct.keyFeatures.map((feat, i) => (
                  <li key={i} className="flex items-start gap-1.5">
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                    <span>{feat}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-4 border-t border-slate-100 flex flex-wrap items-center gap-2.5">
            <Button
              variant="secondary"
              size="md"
              className="flex-1"
              leftIcon={<FileText className="w-4 h-4" />}
              onClick={() => {
                addToQuote(quickviewProduct);
                closeQuickview();
              }}
            >
              Add to Quote (BOM)
            </Button>

            <button
              onClick={() => toggleWishlist(quickviewProduct.id)}
              className={`p-2.5 rounded-lg border transition-colors flex items-center justify-center ${
                isWishlisted
                  ? 'bg-rose-50 border-rose-300 text-rose-600'
                  : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
              }`}
              title={isWishlisted ? 'Remove from Saved' : 'Save to Wishlist'}
            >
              <Heart className={`w-5 h-5 ${isWishlisted ? 'fill-rose-500' : ''}`} />
            </button>

            <button
              onClick={() => addToCompare(quickviewProduct)}
              className={`p-2.5 rounded-lg border transition-colors flex items-center justify-center ${
                isCompared
                  ? 'bg-blue-50 border-blue-300 text-blue-700'
                  : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
              }`}
              title={isCompared ? 'In Compare List' : 'Add to Comparison'}
            >
              <BarChart2 className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
};
