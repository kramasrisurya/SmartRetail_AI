'use client';

import React from 'react';
import Image from 'next/image';
import { useStore } from '../../store/useStore';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { X, Trash2, FileText, CheckCircle2, AlertCircle } from 'lucide-react';

export const CompareDrawer: React.FC = () => {
  const {
    compareList,
    isCompareOpen,
    setCompareOpen,
    removeFromCompare,
    clearCompare,
    addToQuote,
  } = useStore();

  if (!isCompareOpen) return null;

  return (
    <Modal
      isOpen={isCompareOpen}
      onClose={() => setCompareOpen(false)}
      title={`Product Comparison (${compareList.length}/4 Selected)`}
      maxWidth="6xl"
    >
      <div className="p-6">
        {compareList.length === 0 ? (
          <div className="text-center py-12 space-y-4">
            <div className="w-16 h-16 bg-blue-50 text-secondary rounded-2xl flex items-center justify-center mx-auto">
              <AlertCircle className="w-8 h-8" />
            </div>
            <h4 className="text-lg font-bold text-slate-900">No Products in Comparison</h4>
            <p className="text-sm text-slate-500 max-w-sm mx-auto">
              Click the compare icon on any product card across the catalog to view a side-by-side technical specification matrix.
            </p>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setCompareOpen(false)}
            >
              Browse Catalog
            </Button>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Action Header */}
            <div className="flex items-center justify-between">
              <p className="text-xs text-slate-500">
                Comparing optical sensor, resolution, AI analytics, and protection standards.
              </p>
              <button
                onClick={clearCompare}
                className="text-xs font-semibold text-rose-600 hover:text-rose-700 flex items-center gap-1"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear All</span>
              </button>
            </div>

            {/* Matrix Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse min-w-[700px]">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="p-3 bg-slate-50 text-slate-500 font-bold uppercase w-1/5">
                      Specification
                    </th>
                    {compareList.map((product) => (
                      <th key={product.id} className="p-3 bg-white align-top relative">
                        <button
                          onClick={() => removeFromCompare(product.id)}
                          className="absolute top-2 right-2 text-slate-400 hover:text-rose-600 p-1"
                          title="Remove from comparison"
                        >
                          <X className="w-4 h-4" />
                        </button>
                        <div className="relative w-20 h-20 bg-slate-100 rounded-lg overflow-hidden mb-2 border border-slate-200">
                          <Image src={product.image} alt={product.name} fill className="object-cover" />
                        </div>
                        <span className="font-mono text-[10px] font-bold text-secondary uppercase block">
                          {product.model}
                        </span>
                        <span className="font-bold text-slate-900 text-xs block line-clamp-2">
                          {product.name}
                        </span>
                        <Button
                          variant="secondary"
                          size="sm"
                          className="mt-2 w-full text-[11px] py-1"
                          onClick={() => addToQuote(product)}
                        >
                          Add to BOM
                        </Button>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  <tr>
                    <td className="p-3 bg-slate-50 font-bold text-slate-700">Category</td>
                    {compareList.map((p) => (
                      <td key={p.id} className="p-3 text-slate-800 font-medium">
                        <Badge variant="secondary" size="sm">{p.category}</Badge>
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="p-3 bg-slate-50 font-bold text-slate-700">Resolution</td>
                    {compareList.map((p) => (
                      <td key={p.id} className="p-3 text-slate-800 font-semibold">
                        {p.specs.resolution || 'N/A'}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="p-3 bg-slate-50 font-bold text-slate-700">Image Sensor</td>
                    {compareList.map((p) => (
                      <td key={p.id} className="p-3 text-slate-700">
                        {p.specs.sensor || 'N/A'}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="p-3 bg-slate-50 font-bold text-slate-700">IR / Night Range</td>
                    {compareList.map((p) => (
                      <td key={p.id} className="p-3 text-slate-700">
                        {p.specs.irRange || 'N/A'}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="p-3 bg-slate-50 font-bold text-slate-700">WDR (Dynamic Range)</td>
                    {compareList.map((p) => (
                      <td key={p.id} className="p-3 text-slate-700">
                        {p.specs.wdr || 'Standard'}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="p-3 bg-slate-50 font-bold text-slate-700">Protection Rating</td>
                    {compareList.map((p) => (
                      <td key={p.id} className="p-3 text-slate-700">
                        {p.specs.protectionRating || 'IP54'}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="p-3 bg-slate-50 font-bold text-slate-700">AI Edge Analytics</td>
                    {compareList.map((p) => (
                      <td key={p.id} className="p-3 text-slate-700">
                        <ul className="space-y-1">
                          {p.specs.aiFeatures?.map((f, i) => (
                            <li key={i} className="text-[11px] flex items-center gap-1 text-slate-600">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                              <span>{f}</span>
                            </li>
                          )) || <li>Standard</li>}
                        </ul>
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="p-3 bg-slate-50 font-bold text-slate-700">Operating Temp</td>
                    {compareList.map((p) => (
                      <td key={p.id} className="p-3 text-slate-700">
                        {p.specs.operatingTemp || '-30°C to +60°C'}
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};
