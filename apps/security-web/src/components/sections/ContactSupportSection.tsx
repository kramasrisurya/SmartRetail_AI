'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Container } from '../ui/Container';
import { SectionHeader } from '../ui/SectionHeader';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { useStore } from '../../store/useStore';
import {
  Phone,
  Mail,
  MessageSquare,
  ShieldAlert,
  Send,
  CheckCircle2,
  Clock,
  Headphones,
  User,
} from 'lucide-react';

export const ContactSupportSection: React.FC = () => {
  const { addToast } = useStore();

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    type: 'pre-sales',
    message: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!formData.name.trim()) errs.name = 'Contact name is required';
    if (!formData.email.trim()) {
      errs.email = 'Corporate email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errs.email = 'Please provide a valid email format';
    }
    if (!formData.phone.trim()) errs.phone = 'Phone number is required for ticket tracking';
    if (!formData.message.trim() || formData.message.length < 10) {
      errs.message = 'Please provide at least 10 characters detailing your request';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) {
      addToast({
        type: 'error',
        title: 'Form Validation Error',
        message: 'Please resolve highlighted fields before submitting.',
      });
      return;
    }

    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      setIsSubmitted(true);
      addToast({
        type: 'success',
        title: 'Support Ticket Created',
        message: 'Your inquiry has been assigned to a Level-2 Security Engineer.',
      });
    }, 1200);
  };

  return (
    <section id="support" className="py-20 sm:py-24 bg-white relative border-b border-slate-200/80">
      <Container>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-start">
          {/* Left Column: Direct Support Hotlines & NOC Hub (Spans 5) */}
          <div className="lg:col-span-5 space-y-6">
            <SectionHeader
              eyebrow="24/7 Support & Consultation"
              title="Enterprise Service, NOC & Pre-Sales Support"
              description="Get immediate technical guidance, RMA warranty replacements, firmware advisories, or pre-sales system sizing from certified engineers."
              align="left"
              className="mb-6"
            />

            {/* Direct Contact Cards */}
            <div className="space-y-3.5">
              {/* Card 1: Toll Free Phone */}
              <a
                href="tel:18002099999"
                className="flex items-start gap-4 p-4 rounded-2xl border border-slate-200 bg-slate-50 hover:bg-blue-50/60 hover:border-blue-300 transition-all group shadow-sm"
              >
                <div className="w-11 h-11 rounded-xl bg-blue-100 text-secondary flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  <Phone className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                    Toll-Free Enterprise Support
                  </span>
                  <p className="text-base font-bold text-slate-900 group-hover:text-secondary transition-colors">
                    1800-209-9999 / +91 22 6855 0000
                  </p>
                  <p className="text-[11px] text-slate-500 mt-0.5">Mon–Sat, 9:00 AM – 7:00 PM IST</p>
                </div>
              </a>

              {/* Card 2: WhatsApp Chat */}
              <a
                href="https://wa.me/919820012345"
                target="_blank"
                rel="noreferrer"
                className="flex items-start gap-4 p-4 rounded-2xl border border-slate-200 bg-slate-50 hover:bg-emerald-50/60 hover:border-emerald-300 transition-all group shadow-sm"
              >
                <div className="w-11 h-11 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  <MessageSquare className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                    Instant WhatsApp Technical Desk
                  </span>
                  <p className="text-base font-bold text-slate-900 group-hover:text-emerald-700 transition-colors">
                    +91 98200 12345
                  </p>
                  <p className="text-[11px] text-slate-500 mt-0.5">Fast diagram reviews & error code diagnosis</p>
                </div>
              </a>

              {/* Card 3: Email Desk */}
              <a
                href="mailto:support@aegis-security.com"
                className="flex items-start gap-4 p-4 rounded-2xl border border-slate-200 bg-slate-50 hover:bg-amber-50/60 hover:border-amber-300 transition-all group shadow-sm"
              >
                <div className="w-11 h-11 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  <Mail className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                    Email Desk & RFP Inquiries
                  </span>
                  <p className="text-base font-bold text-slate-900 group-hover:text-amber-800 transition-colors">
                    support@aegis-security.com
                  </p>
                  <p className="text-[11px] text-slate-500 mt-0.5">Formal quotation responses in &lt;4 hours</p>
                </div>
              </a>
            </div>
          </div>

          {/* Right Column: Interactive Contact & Support Ticket Form (Spans 7) */}
          <div className="lg:col-span-7 bg-slate-50/80 p-6 sm:p-10 rounded-3xl border border-slate-200 shadow-card">
            {isSubmitted ? (
              <div className="text-center py-12 space-y-4">
                <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto border border-emerald-200">
                  <CheckCircle2 className="w-10 h-10" />
                </div>
                <h3 className="text-xl font-bold text-slate-900">Inquiry Assigned Successfully</h3>
                <p className="text-xs sm:text-sm text-slate-600 max-w-md mx-auto leading-relaxed">
                  Ticket Reference: <strong className="font-mono text-secondary">TKT-{(Math.random() * 100000).toFixed(0)}</strong>.
                  A designated application engineer will contact you shortly via email and phone.
                </p>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setIsSubmitted(false);
                    setFormData({ name: '', email: '', phone: '', type: 'pre-sales', message: '' });
                  }}
                >
                  Submit Another Request
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="border-b border-slate-200 pb-3 mb-2">
                  <h3 className="text-base font-bold text-slate-900">
                    Submit Technical Inquiry or Pre-Sales RFP
                  </h3>
                  <p className="text-xs text-slate-500">
                    Fields marked with (<span className="text-red-500">*</span>) are mandatory.
                  </p>
                </div>

                {/* Name & Email */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="Full Name"
                    required
                    placeholder="e.g. Anand Sharma"
                    error={errors.name}
                    leftIcon={<User className="w-4 h-4" />}
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                  <Input
                    label="Corporate Email"
                    type="email"
                    required
                    placeholder="a.sharma@organization.com"
                    error={errors.email}
                    leftIcon={<Mail className="w-4 h-4" />}
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>

                {/* Phone & Inquiry Type */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="Phone Number"
                    required
                    placeholder="+91 98765 43210"
                    error={errors.phone}
                    leftIcon={<Phone className="w-4 h-4" />}
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  />

                  <div>
                    <label className="block text-sm font-semibold text-slate-800 mb-1.5">
                      Inquiry Nature <span className="text-red-500">*</span>
                    </label>
                    <select
                      className="w-full bg-white text-slate-900 border border-slate-300 text-sm rounded-lg py-2.5 px-3 focus:outline-none focus:ring-2 focus:ring-secondary/20 focus:border-secondary"
                      value={formData.type}
                      onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    >
                      <option value="pre-sales">Enterprise Pre-Sales / BOM Sizing</option>
                      <option value="technical">Technical Support / Firmware VMS</option>
                      <option value="partner">System Integrator Partner Application</option>
                      <option value="rma">RMA Warranty Claim / Service</option>
                    </select>
                  </div>
                </div>

                {/* Message / Description */}
                <div>
                  <label className="block text-sm font-semibold text-slate-800 mb-1.5">
                    Technical Specifications / Message <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    rows={4}
                    className={`w-full bg-white text-slate-900 border text-sm rounded-lg p-3 placeholder:text-slate-400 focus:outline-none focus:ring-2 ${
                      errors.message
                        ? 'border-red-500 focus:ring-red-500/20'
                        : 'border-slate-300 focus:border-secondary focus:ring-secondary/20'
                    }`}
                    placeholder="Describe your site requirements, camera resolution, storage days, or technical challenge..."
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  />
                  {errors.message && (
                    <p className="mt-1 text-xs text-red-600 font-medium">{errors.message}</p>
                  )}
                </div>

                {/* Submit CTA */}
                <div className="pt-2">
                  <Button
                    type="submit"
                    variant="secondary"
                    size="lg"
                    className="w-full shadow-md"
                    isLoading={isSubmitting}
                    leftIcon={<Send className="w-4 h-4" />}
                  >
                    Submit Support Ticket
                  </Button>
                </div>
              </form>
            )}
          </div>
        </div>
      </Container>
    </section>
  );
};
