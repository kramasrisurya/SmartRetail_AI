'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Search,
  Heart,
  BarChart2,
  Menu,
  ChevronDown,
  User,
  Shield,
  FileText,
} from 'lucide-react';
import { Button } from '../ui/Button';
import { MegaMenu } from './MegaMenu';
import { productsMegaMenu, solutionsMegaMenu } from '../../data/megaMenuData';
import { useStore } from '../../store/useStore';

interface HeaderProps {
  onOpenMobileMenu: () => void;
  onOpenQuoteModal: () => void;
  onOpenLoginModal: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenMobileMenu,
  onOpenQuoteModal,
  onOpenLoginModal,
}) => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [activeMegaMenu, setActiveMegaMenu] = useState<'products' | 'solutions' | null>(null);

  const {
    wishlist,
    compareList,
    setWishlistOpen,
    setCompareOpen,
    setSearchOpen,
  } = useStore();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 30);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <header
      className={`sticky top-0 z-40 transition-all duration-300 ${
        isScrolled
          ? 'bg-white/95 backdrop-blur-md shadow-header py-2.5 border-b border-slate-200/80'
          : 'bg-white py-3.5 border-b border-slate-100'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-4">
          {/* Brand Logo */}
          <a href="#" className="flex items-center gap-3 group shrink-0">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary via-navy-800 to-secondary flex items-center justify-center text-white shadow-md group-hover:shadow-glow-blue transition-all">
              <Shield className="w-6 h-6 text-cyan-400 group-hover:scale-110 transition-transform" />
            </div>
            <div className="flex flex-col">
              <span className="font-heading font-black text-xl tracking-tight text-slate-900 group-hover:text-primary transition-colors flex items-center gap-1.5">
                AEGIS <span className="text-secondary">SECURITY</span>
              </span>
              <span className="text-[10px] font-bold text-slate-500 tracking-widest uppercase -mt-1">
                Enterprise Vision & AI Systems
              </span>
            </div>
          </a>

          {/* Desktop Navigation Links with MegaMenu Triggers */}
          <nav className="hidden lg:flex items-center space-x-1 xl:space-x-2">
            {/* Products MegaMenu Trigger */}
            <div
              className="relative"
              onMouseEnter={() => setActiveMegaMenu('products')}
            >
              <button
                className={`flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-semibold transition-colors ${
                  activeMegaMenu === 'products'
                    ? 'text-secondary bg-blue-50/80'
                    : 'text-slate-800 hover:text-secondary hover:bg-slate-50'
                }`}
              >
                <span>Products</span>
                <ChevronDown
                  className={`w-4 h-4 transition-transform duration-200 ${
                    activeMegaMenu === 'products' ? 'rotate-180 text-secondary' : 'text-slate-400'
                  }`}
                />
              </button>
            </div>

            {/* Solutions MegaMenu Trigger */}
            <div
              className="relative"
              onMouseEnter={() => setActiveMegaMenu('solutions')}
            >
              <button
                className={`flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-semibold transition-colors ${
                  activeMegaMenu === 'solutions'
                    ? 'text-secondary bg-blue-50/80'
                    : 'text-slate-800 hover:text-secondary hover:bg-slate-50'
                }`}
              >
                <span>Solutions</span>
                <ChevronDown
                  className={`w-4 h-4 transition-transform duration-200 ${
                    activeMegaMenu === 'solutions' ? 'rotate-180 text-secondary' : 'text-slate-400'
                  }`}
                />
              </button>
            </div>

            {/* Direct Links */}
            <a
              href="#about"
              className="px-3 py-2 rounded-lg text-sm font-semibold text-slate-800 hover:text-secondary hover:bg-slate-50 transition-colors"
            >
              About Us
            </a>
            <a
              href="#certifications"
              className="px-3 py-2 rounded-lg text-sm font-semibold text-slate-800 hover:text-secondary hover:bg-slate-50 transition-colors"
            >
              Training (ACE)
            </a>
            <a
              href="#blog"
              className="px-3 py-2 rounded-lg text-sm font-semibold text-slate-800 hover:text-secondary hover:bg-slate-50 transition-colors"
            >
              Insights
            </a>
            <a
              href="#support"
              className="px-3 py-2 rounded-lg text-sm font-semibold text-slate-800 hover:text-secondary hover:bg-slate-50 transition-colors"
            >
              Support
            </a>
          </nav>

          {/* Action Icons & CTA Buttons */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Search Icon */}
            <button
              onClick={() => setSearchOpen(true)}
              className="p-2 rounded-lg text-slate-700 hover:text-secondary hover:bg-slate-100 transition-colors relative"
              aria-label="Open Search"
              title="Search Products & Solutions"
            >
              <Search className="w-5 h-5" />
            </button>

            {/* Wishlist Icon with Badge */}
            <button
              onClick={() => setWishlistOpen(true)}
              className="p-2 rounded-lg text-slate-700 hover:text-rose-600 hover:bg-rose-50 transition-colors relative"
              aria-label="View Saved Items"
              title="Saved Items"
            >
              <Heart className="w-5 h-5" />
              {wishlist.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-rose-500 text-white font-bold text-[10px] w-4 h-4 rounded-full flex items-center justify-center animate-pulse-subtle">
                  {wishlist.length}
                </span>
              )}
            </button>

            {/* Compare Icon with Badge */}
            <button
              onClick={() => setCompareOpen(true)}
              className="p-2 rounded-lg text-slate-700 hover:text-secondary hover:bg-blue-50 transition-colors relative"
              aria-label="Compare Products"
              title="Technical Product Comparison"
            >
              <BarChart2 className="w-5 h-5" />
              {compareList.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-secondary text-white font-bold text-[10px] w-4 h-4 rounded-full flex items-center justify-center">
                  {compareList.length}
                </span>
              )}
            </button>

            {/* Partner Login Button */}
            <button
              onClick={onOpenLoginModal}
              className="hidden md:flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold text-slate-700 hover:text-slate-900 hover:bg-slate-100 transition-colors"
            >
              <User className="w-4 h-4 text-slate-500" />
              <span>Partner Login</span>
            </button>

            {/* Get a Quote Button */}
            <Button
              variant="secondary"
              size="sm"
              className="hidden sm:inline-flex shadow-sm"
              leftIcon={<FileText className="w-4 h-4" />}
              onClick={onOpenQuoteModal}
            >
              Get a Quote
            </Button>

            {/* Mobile Menu Hamburger */}
            <button
              onClick={onOpenMobileMenu}
              className="lg:hidden p-2 rounded-lg text-slate-800 hover:bg-slate-100 transition-colors"
              aria-label="Open navigation menu"
            >
              <Menu className="w-6 h-6" />
            </button>
          </div>
        </div>
      </div>

      {/* Full-Width Mega Menu Dropdowns */}
      <MegaMenu
        isOpen={activeMegaMenu === 'products'}
        categories={productsMegaMenu}
        viewAllLink="#products"
        viewAllText="Explore Complete Enterprise Product Catalog (100+ Models)"
        onClose={() => setActiveMegaMenu(null)}
      />

      <MegaMenu
        isOpen={activeMegaMenu === 'solutions'}
        categories={solutionsMegaMenu}
        viewAllLink="#solutions"
        viewAllText="Explore All 12 Industry Vertical Solutions"
        onClose={() => setActiveMegaMenu(null)}
      />
    </header>
  );
};
