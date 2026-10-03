'use client';

import React, { useState } from 'react';
import { Phone, Mail, Globe, Shield, X } from 'lucide-react';

export const TopBar: React.FC = () => {
  const [isVisible, setIsVisible] = useState(true);

  if (!isVisible) return null;

  return (
    <div className="bg-navy-950 text-slate-300 text-xs border-b border-slate-800/80 py-1.5 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-y-2">
        {/* Left: Contact Info */}
        <div className="flex items-center gap-4 sm:gap-6 flex-wrap">
          <a
            href="tel:18002099999"
            className="flex items-center gap-1.5 hover:text-white transition-colors"
          >
            <Phone className="w-3.5 h-3.5 text-secondary" />
            <span className="font-medium">Toll-Free: 1800-209-9999</span>
          </a>
          <a
            href="mailto:support@aegis-security.com"
            className="hidden sm:flex items-center gap-1.5 hover:text-white transition-colors"
          >
            <Mail className="w-3.5 h-3.5 text-secondary" />
            <span>sales@aegis-security.com</span>
          </a>
          <div className="hidden lg:flex items-center gap-1.5 text-amber-400 font-medium bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
            <Shield className="w-3 h-3" />
            <span>Make in India • ISO 9001 & 27001 Certified</span>
          </div>
        </div>

        {/* Right: Partner Portal & Language */}
        <div className="flex items-center gap-4 ml-auto">
          <a
            href="#certifications"
            className="text-slate-300 hover:text-accent font-medium transition-colors"
          >
            Partner Portal
          </a>
          <span className="text-slate-700">|</span>
          <a
            href="#support"
            className="text-slate-300 hover:text-white transition-colors"
          >
            NOC 24/7 Hotline
          </a>
          <span className="text-slate-700">|</span>
          <div className="flex items-center gap-1 text-slate-300 hover:text-white cursor-pointer">
            <Globe className="w-3.5 h-3.5 text-secondary" />
            <span>India (EN)</span>
          </div>
          <button
            onClick={() => setIsVisible(false)}
            className="text-slate-500 hover:text-slate-300 ml-1 p-0.5"
            aria-label="Dismiss announcement"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
