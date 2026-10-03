'use client';

import React, { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, ArrowRight, Shield, ShieldCheck, Eye, Cpu } from 'lucide-react';
import { Button } from '../ui/Button';
import { Container } from '../ui/Container';

interface HeroSectionProps {
  onOpenQuote: () => void;
}

const slides = [
  {
    id: 1,
    eyebrow: 'Next-Gen Video Surveillance',
    title: '8K UltraDark AI Surveillance with Starlight Color Imaging',
    description: 'Empowering smart cities, national highways, and critical infrastructure with deep-learning perimeter radar and 500m laser IR optics.',
    image: 'https://images.unsplash.com/photo-1557597774-9d273605dfa9?auto=format&fit=crop&w=2000&q=85',
    ctaPrimary: 'Explore 8K Cameras',
    ctaPrimaryHref: '#products',
    badge: 'Make in India Enterprise Approved',
  },
  {
    id: 2,
    eyebrow: 'City-Scale Intelligence',
    title: 'Integrated Command & Control Centers (ICCC)',
    description: 'Unify 50,000+ camera nodes, automated ANPR traffic enforcement, GIS incident mapping, and emergency panic dispatch on seamless 4K video walls.',
    image: 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=2000&q=85',
    ctaPrimary: 'View Smart City Solutions',
    ctaPrimaryHref: '#solutions',
    badge: '65+ Cities Deployed',
  },
  {
    id: 3,
    eyebrow: 'Touchless Access & Turnstiles',
    title: '0.2s Dual-Biometric Face & Palm Speed Gates',
    description: 'High-throughput lobby flap barrier turnstiles with anti-tailgating AI, anti-spoofing live verification, and seamless SAP/Oracle HRMS integration.',
    image: 'https://images.unsplash.com/photo-1563986768609-322da13575f3?auto=format&fit=crop&w=2000&q=85',
    ctaPrimary: 'Explore Access Terminals',
    ctaPrimaryHref: '#products',
    badge: 'Touchless Cleanroom Grade',
  },
  {
    id: 4,
    eyebrow: 'Thermal Early Warning',
    title: 'Dual-Spectrum Thermal Fire & Perimeter Radar Fusion',
    description: 'Instant hotspot temperature alerts down to ±2°C accuracy for oil refineries, chemical plants, and electrical substations before smoke forms.',
    image: 'https://images.unsplash.com/photo-1508873696983-2df5703bc20d?auto=format&fit=crop&w=2000&q=85',
    ctaPrimary: 'Explore Thermal AI',
    ctaPrimaryHref: '#products',
    badge: 'ATEX & IECEx Certified',
  },
];

export const HeroSection: React.FC<HeroSectionProps> = ({ onOpenQuote }) => {
  const [current, setCurrent] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const nextSlide = () => setCurrent((prev) => (prev + 1) % slides.length);
  const prevSlide = () => setCurrent((prev) => (prev - 1 + slides.length) % slides.length);

  useEffect(() => {
    if (!isPaused) {
      timerRef.current = setInterval(nextSlide, 6000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPaused, current]);

  const slide = slides[current];

  return (
    <section
      className="relative w-full h-[580px] sm:h-[640px] lg:h-[720px] bg-navy-950 overflow-hidden select-none"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      role="region"
      aria-roledescription="carousel"
      aria-label="Enterprise Security Hero Slider"
    >
      {/* Background Image with Crossfade */}
      <AnimatePresence mode="wait">
        <motion.div
          key={slide.id}
          initial={{ opacity: 0, scale: 1.05 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.98 }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className="absolute inset-0"
        >
          <Image
            src={slide.image}
            alt={slide.title}
            fill
            priority
            className="object-cover object-center"
          />
          {/* Gradient Overlays: Dark Left-to-Right + Bottom Vignette */}
          <div className="absolute inset-0 bg-gradient-to-r from-navy-950 via-navy-950/85 to-navy-950/30" />
          <div className="absolute inset-0 bg-gradient-to-t from-navy-950 via-transparent to-navy-950/40" />
        </motion.div>
      </AnimatePresence>

      {/* Foreground Content Container */}
      <div className="relative h-full flex items-center z-20">
        <Container>
          <div className="max-w-2xl lg:max-w-3xl space-y-6">
            <AnimatePresence mode="wait">
              <motion.div
                key={slide.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.5, delay: 0.1 }}
                className="space-y-4"
              >
                {/* Eyebrow & Badge */}
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-secondary/20 border border-secondary/40 text-cyan-300 text-xs font-bold uppercase tracking-widest backdrop-blur-md">
                    <Shield className="w-3.5 h-3.5 text-cyan-400" />
                    {slide.eyebrow}
                  </span>
                  <span className="hidden sm:inline-flex items-center gap-1 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-semibold backdrop-blur-md">
                    <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
                    {slide.badge}
                  </span>
                </div>

                {/* Hero Title */}
                <h1 className="text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-black font-heading tracking-tight text-white leading-[1.1]">
                  {slide.title}
                </h1>

                {/* Subtitle / Description */}
                <p className="text-base sm:text-lg text-slate-300 leading-relaxed max-w-2xl">
                  {slide.description}
                </p>
              </motion.div>
            </AnimatePresence>

            {/* CTA Buttons */}
            <div className="flex flex-wrap items-center gap-3.5 pt-2">
              <a href={slide.ctaPrimaryHref}>
                <Button
                  variant="secondary"
                  size="lg"
                  rightIcon={<ArrowRight className="w-4 h-4" />}
                >
                  {slide.ctaPrimary}
                </Button>
              </a>
              <Button
                variant="dark"
                size="lg"
                onClick={onOpenQuote}
              >
                Request Project Quote
              </Button>
            </div>
          </div>
        </Container>
      </div>

      {/* Arrow Controls */}
      <button
        onClick={prevSlide}
        className="absolute left-4 sm:left-6 top-1/2 -translate-y-1/2 z-30 p-3 rounded-full bg-navy-950/60 hover:bg-secondary text-white border border-slate-700/80 backdrop-blur-md transition-all hover:scale-105 shadow-xl hidden sm:flex items-center justify-center"
        aria-label="Previous slide"
      >
        <ChevronLeft className="w-5 h-5" />
      </button>

      <button
        onClick={nextSlide}
        className="absolute right-4 sm:right-6 top-1/2 -translate-y-1/2 z-30 p-3 rounded-full bg-navy-950/60 hover:bg-secondary text-white border border-slate-700/80 backdrop-blur-md transition-all hover:scale-105 shadow-xl hidden sm:flex items-center justify-center"
        aria-label="Next slide"
      >
        <ChevronRight className="w-5 h-5" />
      </button>

      {/* Bottom Bar: Dots and Progress */}
      <div className="absolute bottom-6 left-0 w-full z-30">
        <Container>
          <div className="flex items-center justify-between">
            {/* Dot Indicators */}
            <div className="flex items-center gap-2.5">
              {slides.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrent(idx)}
                  className={`h-2.5 rounded-full transition-all duration-300 ${
                    current === idx
                      ? 'w-8 bg-secondary shadow-glow-blue'
                      : 'w-2.5 bg-slate-600 hover:bg-slate-400'
                  }`}
                  aria-label={`Go to slide ${idx + 1}`}
                />
              ))}
            </div>

            {/* Quick Live Stats Indicator */}
            <div className="hidden md:flex items-center gap-6 text-xs text-slate-400">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                <strong className="text-white">1M+</strong> Active Endpoints
              </span>
              <span>•</span>
              <span>
                <strong className="text-white">24/7</strong> NOC Monitoring
              </span>
            </div>
          </div>
        </Container>
      </div>
    </section>
  );
};
