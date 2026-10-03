'use client';

import React from 'react';
import Image from 'next/image';
import { useStore } from '../../store/useStore';
import { productsData } from '../../data/products';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Trash2, FileText, ArrowRight, Heart, ShoppingBag } from 'lucide-react';

export const WishlistDrawer: React.FC = () => {
  const {
    wishlist,
    isWishlistOpen,
    setWishlistOpen,
    toggleWishlist,
    addToQuote,
    openQuickview,
    setQuoteModalOpen,
  } = useStore();

  const savedProducts = productsData.filter((p) => wishlist.includes(p.id));

  if (!isWishlistOpen) return null;

  return (
    <Modal
      isOpen={isWishlistOpen}
      onClose={() => setWishlistOpen(false)}
      title={`Saved Hardware Items (${savedProducts.length})`}
      maxWidth="lg"
    >
      <div className="p-6">
        {savedProducts.length === 0 ? (
          <div className="text-center py-10 space-y-4">
            <div className="w-14 h-14 bg-rose-50 text-rose-500 rounded-2xl flex items-center justify-center mx-auto">
              <Heart className="w-7 h-7" />
            </div>
            <h4 className="text-base font-bold text-slate-900">Your Saved List is Empty</h4>
            <p className="text-xs text-slate-500 max-w-xs mx-auto">
              Click the heart icon on any camera, NVR, or access control product to bookmark it for later review.
            </p>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setWishlistOpen(false)}
            >
              Explore Products
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="divide-y divide-slate-100 max-h-[50vh] overflow-y-auto pr-1">
              {savedProducts.map((p) => (
                <div key={p.id} className="py-3.5 flex items-center gap-3">
                  <div className="relative w-16 h-16 rounded-lg bg-slate-100 border border-slate-200 overflow-hidden shrink-0">
                    <Image src={p.image} alt={p.name} fill className="object-cover" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="font-mono text-[10px] font-bold text-secondary uppercase block">
                      {p.model}
                    </span>
                    <h5
                      onClick={() => {
                        setWishlistOpen(false);
                        openQuickview(p);
                      }}
                      className="text-xs font-bold text-slate-900 truncate hover:text-secondary cursor-pointer"
                    >
                      {p.name}
                    </h5>
                    <p className="text-[11px] text-slate-500 truncate mt-0.5">{p.shortDescription}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <button
                        onClick={() => addToQuote(p)}
                        className="text-[11px] font-semibold text-secondary hover:underline flex items-center gap-1"
                      >
                        <FileText className="w-3 h-3" />
                        <span>Add to Quote</span>
                      </button>
                      <span className="text-slate-300">•</span>
                      <button
                        onClick={() => toggleWishlist(p.id)}
                        className="text-[11px] font-medium text-rose-600 hover:underline flex items-center gap-1"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>Remove</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Bottom Actions */}
            <div className="pt-4 border-t border-slate-100 space-y-2">
              <Button
                variant="secondary"
                size="md"
                className="w-full"
                leftIcon={<FileText className="w-4 h-4" />}
                onClick={() => {
                  savedProducts.forEach((p) => addToQuote(p));
                  setWishlistOpen(false);
                  setQuoteModalOpen(true);
                }}
              >
                Add All to Enterprise Quote
              </Button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};
