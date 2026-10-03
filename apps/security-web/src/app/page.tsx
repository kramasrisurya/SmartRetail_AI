'use client';

import React, { useState } from 'react';
import { TopBar } from '../components/layout/TopBar';
import { Header } from '../components/layout/Header';
import { MobileDrawer } from '../components/layout/MobileDrawer';
import { LoginModal } from '../components/modals/LoginModal';
import { HeroSection } from '../components/sections/HeroSection';
import { TrustStatsSection } from '../components/sections/TrustStatsSection';
import { AboutSection } from '../components/sections/AboutSection';
import { ProductsSection } from '../components/sections/ProductsSection';
import { SolutionsSection } from '../components/sections/SolutionsSection';
import { CertificationsSection } from '../components/sections/CertificationsSection';
import { BlogSection } from '../components/sections/BlogSection';
import { TestimonialsSection } from '../components/sections/TestimonialsSection';
import { ContactSupportSection } from '../components/sections/ContactSupportSection';
import { NewsletterSection } from '../components/sections/NewsletterSection';
import { Footer } from '../components/layout/Footer';
import { useStore } from '../store/useStore';

export default function Home() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const { setQuoteModalOpen } = useStore();

  const handleOpenQuote = () => {
    setQuoteModalOpen(true);
  };

  return (
    <div className="flex-1 flex flex-col w-full bg-white">
      {/* 4.1 Sticky Header & Utility Navigation */}
      <TopBar />
      <Header
        onOpenMobileMenu={() => setIsMobileMenuOpen(true)}
        onOpenQuoteModal={handleOpenQuote}
        onOpenLoginModal={() => setIsLoginModalOpen(true)}
      />

      {/* Main Sections Ordered 4.2 to 4.11 */}
      <main className="flex-1">
        {/* 4.2 Hero Section */}
        <HeroSection onOpenQuote={handleOpenQuote} />

        {/* 4.3 Trust Bar / Stats Strip */}
        <TrustStatsSection />

        {/* 4.4 About Us Section */}
        <AboutSection onOpenQuote={handleOpenQuote} />

        {/* 4.5 Products Section (Tabbed Catalog) */}
        <ProductsSection />

        {/* 4.6 Vertical Industry Solutions */}
        <SolutionsSection onOpenQuote={handleOpenQuote} />

        {/* 4.7 Certification Training Section */}
        <CertificationsSection />

        {/* 4.8 Blog & Press Releases */}
        <BlogSection />

        {/* 4.9 Testimonials & Case Studies */}
        <TestimonialsSection />

        {/* 4.10 Product Service, Support & Inquiry Form */}
        <ContactSupportSection />

        {/* 4.11 Newsletter Subscription */}
        <NewsletterSection />
      </main>

      {/* 4.12 Enterprise 4-Column Footer */}
      <Footer />

      {/* Interactive Overlays */}
      <MobileDrawer
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
        onOpenQuote={handleOpenQuote}
      />

      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
      />
    </div>
  );
}
