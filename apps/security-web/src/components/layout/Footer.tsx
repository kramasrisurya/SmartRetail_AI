'use client';

import React from 'react';
import {
  Shield,
  Phone,
  Mail,
  MapPin,
  Linkedin,
  Youtube,
  Twitter,
  Facebook,
  ArrowRight,
  ShieldCheck,
  AlertTriangle,
} from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-navy-950 text-slate-400 text-sm border-t border-slate-800">
      {/* Top Banner: 24/7 Hotline Strip */}
      <div className="border-b border-slate-800/80 bg-navy-900/60 py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3 text-center md:text-left">
            <div className="w-10 h-10 rounded-xl bg-secondary/10 border border-secondary/30 flex items-center justify-center text-secondary shrink-0">
              <Phone className="w-5 h-5" />
            </div>
            <div>
              <p className="text-white font-bold text-base leading-tight">
                Enterprise Pre-Sales & Technical Support Hotline
              </p>
              <p className="text-xs text-slate-400">
                Direct access to Level-3 Certified Security Architects (Monday – Saturday, 9:00 AM – 7:00 PM IST)
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <a
              href="tel:18002099999"
              className="text-white font-bold text-lg hover:text-secondary transition-colors"
            >
              1800-209-9999
            </a>
            <span className="text-slate-700">|</span>
            <a
              href="#support"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-secondary hover:text-white transition-colors px-3 py-1.5 rounded-lg bg-secondary/10 border border-secondary/20 hover:bg-secondary hover:text-white"
            >
              <span>Submit Support Ticket</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      </div>

      {/* Main 4-Column Footer Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10">
          {/* Column 1 (Spans 2 on large): Brand & Company Info */}
          <div className="lg:col-span-2 space-y-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary via-navy-800 to-secondary flex items-center justify-center text-white shadow-md">
                <Shield className="w-6 h-6 text-cyan-400" />
              </div>
              <div>
                <span className="font-heading font-black text-xl tracking-tight text-white flex items-center gap-1.5">
                  AEGIS <span className="text-secondary">SECURITY</span>
                </span>
                <span className="text-[10px] font-bold text-slate-400 tracking-widest uppercase block -mt-1">
                  Enterprise Vision & AI Systems
                </span>
              </div>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed max-w-sm">
              Aegis Security is India's leading manufacturer and innovator of intelligent video surveillance,
              touchless access control systems, thermal fire defense, and AI-driven smart city infrastructure.
            </p>

            <div className="space-y-2 text-xs text-slate-400">
              <div className="flex items-start gap-2.5">
                <MapPin className="w-4 h-4 text-secondary shrink-0 mt-0.5" />
                <span>
                  Corporate HQ: Aegis Towers, Bandra-Kurla Complex (BKC), Mumbai, Maharashtra 400051
                </span>
              </div>
              <div className="flex items-center gap-2.5">
                <Mail className="w-4 h-4 text-secondary shrink-0" />
                <span>contact@aegis-security.com</span>
              </div>
            </div>

            {/* Social Media Links */}
            <div className="flex items-center gap-3 pt-2">
              {[
                { icon: <Linkedin className="w-4 h-4" />, href: '#', label: 'LinkedIn' },
                { icon: <Youtube className="w-4 h-4" />, href: '#', label: 'YouTube' },
                { icon: <Twitter className="w-4 h-4" />, href: '#', label: 'Twitter / X' },
                { icon: <Facebook className="w-4 h-4" />, href: '#', label: 'Facebook' },
              ].map((item, idx) => (
                <a
                  key={idx}
                  href={item.href}
                  aria-label={item.label}
                  className="w-8 h-8 rounded-lg bg-navy-850 border border-slate-800 flex items-center justify-center text-slate-400 hover:text-white hover:border-secondary hover:bg-secondary/20 transition-all"
                >
                  {item.icon}
                </a>
              ))}
            </div>
          </div>

          {/* Column 2: Industry Solutions */}
          <div className="space-y-4">
            <h4 className="text-white text-xs font-bold uppercase tracking-wider border-b border-slate-800 pb-2">
              Industry Solutions
            </h4>
            <ul className="space-y-2 text-xs">
              {[
                'Smart Traffic & ANPR',
                'Education & Campuses',
                'Banking & Financial Vaults',
                'Healthcare & Hospital ICU',
                'Smart Manufacturing',
                'Public Transit & Metros',
                'Smart Cities & Safe City',
                'Retail Loss Prevention',
                'Critical Energy & Oil Plants',
              ].map((name, idx) => (
                <li key={idx}>
                  <a href="#solutions" className="hover:text-white transition-colors block py-0.5">
                    {name}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 3: Technical Support & Downloads */}
          <div className="space-y-4">
            <h4 className="text-white text-xs font-bold uppercase tracking-wider border-b border-slate-800 pb-2">
              Service & Support
            </h4>
            <ul className="space-y-2 text-xs">
              {[
                'Firmware & VMS Downloads',
                'Product Spec Sheets & CAD',
                'Lens Angle & Storage Calculator',
                'Warranty Check & RMA',
                'Authorized Partner Portal',
                'Certification Training (ACE)',
                'Developer REST API & SDKs',
                'Security Vulnerability Advisory',
              ].map((name, idx) => (
                <li key={idx}>
                  <a href="#support" className="hover:text-white transition-colors block py-0.5">
                    {name}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 4: Corporate & Compliance */}
          <div className="space-y-4">
            <h4 className="text-white text-xs font-bold uppercase tracking-wider border-b border-slate-800 pb-2">
              Corporate & Governance
            </h4>
            <ul className="space-y-2 text-xs">
              {[
                'About Aegis Corporation',
                'Make in India Manufacturing',
                'Experience Centers & Demos',
                'Careers & Engineering Roles',
                'Press Releases & Insights',
                'ISO 9001 / 27001 Compliance',
                'Whistleblower & Ethics',
                'Sustainability & ESG Reports',
              ].map((name, idx) => (
                <li key={idx}>
                  <a href="#about" className="hover:text-white transition-colors block py-0.5">
                    {name}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Anti-Counterfeiting & Unauthorized Sales Notice */}
        <div className="mt-12 p-4 rounded-xl bg-navy-900/90 border border-amber-500/20 text-xs text-slate-300 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <p className="font-bold text-amber-400">Important Advisory on Grey-Market & E-Commerce Purchases:</p>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Aegis Security Solutions does not authorize, warrant, or provide technical firmware support for products
              purchased through unauthorized online marketplaces or unaccredited resellers. Products without genuine
              serial verification may not receive cloud P2P services or warranty fulfillment.
            </p>
          </div>
        </div>

        {/* Bottom Bar: Copyright & Legal */}
        <div className="mt-10 pt-6 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <p>© {new Date().getFullYear()} Aegis Security Systems Private Limited. All Rights Reserved.</p>
          <div className="flex items-center gap-6">
            <a href="#" className="hover:text-slate-300 transition-colors">
              Privacy Policy
            </a>
            <a href="#" className="hover:text-slate-300 transition-colors">
              Terms of Use
            </a>
            <a href="#" className="hover:text-slate-300 transition-colors">
              Legal & Trademark Notice
            </a>
            <a href="#" className="hover:text-slate-300 transition-colors">
              Cookie Preferences
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};
