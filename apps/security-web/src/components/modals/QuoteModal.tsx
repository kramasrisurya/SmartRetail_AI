'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { useStore } from '../../store/useStore';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Trash2, CheckCircle2, FileText, Send, Building, MapPin, User, Mail, Phone } from 'lucide-react';

export const QuoteModal: React.FC = () => {
  const {
    quoteItems,
    isQuoteModalOpen,
    setQuoteModalOpen,
    removeFromQuote,
    clearQuote,
    addToast,
  } = useStore();

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    company: '',
    city: '',
    projectScope: '',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  if (!isQuoteModalOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.phone) {
      addToast({
        type: 'warning',
        title: 'Incomplete Form',
        message: 'Please fill in all required contact fields.',
      });
      return;
    }

    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      setIsSuccess(true);
      addToast({
        type: 'success',
        title: 'Quote Request Submitted',
        message: 'An enterprise technical consultant will review your BOM within 4 business hours.',
      });
      clearQuote();
    }, 1200);
  };

  const handleClose = () => {
    setQuoteModalOpen(false);
    setIsSuccess(false);
  };

  return (
    <Modal
      isOpen={isQuoteModalOpen}
      onClose={handleClose}
      title="Request Enterprise Project Quotation (BOM)"
      maxWidth="4xl"
    >
      <div className="p-6 sm:p-8">
        {isSuccess ? (
          <div className="text-center py-12 space-y-4">
            <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto border border-emerald-200">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <h3 className="text-xl font-bold text-slate-900">Quotation Request Received</h3>
            <p className="text-sm text-slate-600 max-w-md mx-auto">
              Reference ID: <strong className="font-mono text-secondary">AEGIS-BOM-{(Math.random() * 100000).toFixed(0)}</strong>
              <br />
              Our enterprise solution architect will prepare a formal technical proposal and discounted tier pricing.
            </p>
            <Button variant="secondary" size="md" onClick={handleClose}>
              Done
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Left: Selected BOM Items (Spans 5) */}
            <div className="lg:col-span-5 bg-slate-50 p-5 rounded-xl border border-slate-200 flex flex-col justify-between space-y-4">
              <div>
                <div className="flex items-center justify-between border-b border-slate-200 pb-3 mb-3">
                  <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Selected BOM Hardware ({quoteItems.length})
                  </span>
                  {quoteItems.length > 0 && (
                    <button
                      onClick={clearQuote}
                      className="text-[11px] font-semibold text-rose-600 hover:underline"
                    >
                      Clear All
                    </button>
                  )}
                </div>

                {quoteItems.length === 0 ? (
                  <p className="text-xs text-slate-500 py-6 text-center italic">
                    No items selected yet. You can still submit a general RFP query or add specific camera models from the catalog.
                  </p>
                ) : (
                  <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1">
                    {quoteItems.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center gap-2.5 p-2 rounded-lg bg-white border border-slate-200 text-xs"
                      >
                        <div className="relative w-10 h-10 rounded bg-slate-100 overflow-hidden shrink-0 border border-slate-200">
                          <Image src={item.image} alt={item.name} fill className="object-cover" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <span className="font-mono text-[10px] font-bold text-secondary block">
                            {item.model}
                          </span>
                          <span className="font-bold text-slate-900 block truncate">
                            {item.name}
                          </span>
                        </div>
                        <button
                          onClick={() => removeFromQuote(item.id)}
                          className="text-slate-400 hover:text-rose-600 p-1"
                          title="Remove"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="bg-white p-3 rounded-lg border border-slate-200 text-[11px] text-slate-500">
                ⚡ <strong>SI Partner Pricing:</strong> Certified system integrators receive up to 35% project margin protection.
              </div>
            </div>

            {/* Right: Contact Information Form (Spans 7) */}
            <form onSubmit={handleSubmit} className="lg:col-span-7 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <Input
                  label="Contact Person Name"
                  required
                  placeholder="e.g. Ramesh Kumar"
                  leftIcon={<User className="w-4 h-4" />}
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
                <Input
                  label="Corporate Email"
                  type="email"
                  required
                  placeholder="r.kumar@company.com"
                  leftIcon={<Mail className="w-4 h-4" />}
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <Input
                  label="Phone / Mobile Number"
                  required
                  placeholder="+91 98765 43210"
                  leftIcon={<Phone className="w-4 h-4" />}
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
                <Input
                  label="Organization / Company"
                  placeholder="e.g. Reliance Infrastructure"
                  leftIcon={<Building className="w-4 h-4" />}
                  value={formData.company}
                  onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                />
              </div>

              <Input
                label="Project City / State"
                placeholder="e.g. Hyderabad, Telangana"
                leftIcon={<MapPin className="w-4 h-4" />}
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
              />

              <div>
                <label className="block text-sm font-semibold text-slate-800 mb-1.5">
                  Project Scope & Timeline Details
                </label>
                <textarea
                  rows={3}
                  className="w-full bg-white text-slate-900 border border-slate-300 text-sm rounded-lg p-3 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-secondary/20 focus:border-secondary"
                  placeholder="Provide camera counts, storage requirements (e.g. 30/90 days retention), or integration requirements with third-party VMS/access control..."
                  value={formData.projectScope}
                  onChange={(e) => setFormData({ ...formData, projectScope: e.target.value })}
                />
              </div>

              <div className="pt-2">
                <Button
                  type="submit"
                  variant="secondary"
                  size="lg"
                  className="w-full"
                  isLoading={isSubmitting}
                  leftIcon={<Send className="w-4 h-4" />}
                >
                  Submit RFP / Quote Request
                </Button>
                <p className="text-[11px] text-slate-400 text-center mt-2">
                  All inquiries are protected by strict NDA. Zero spam guarantee.
                </p>
              </div>
            </form>
          </div>
        )}
      </div>
    </Modal>
  );
};
