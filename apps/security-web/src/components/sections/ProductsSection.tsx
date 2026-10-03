'use client';

import React, { useState, useMemo } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { Container } from '../ui/Container';
import { SectionHeader } from '../ui/SectionHeader';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { productsData } from '../../data/products';
import { Product } from '../../types';
import { useStore } from '../../store/useStore';
import {
  Heart,
  BarChart2,
  Eye,
  FileText,
  ChevronLeft,
  ChevronRight,
  Cpu,
  ShieldCheck,
} from 'lucide-react';

interface ProductCardProps {
  product: Product;
}

const ProductCard: React.FC<ProductCardProps> = ({ product }) => {
  const {
    wishlist,
    toggleWishlist,
    compareList,
    addToCompare,
    openQuickview,
    addToQuote,
  } = useStore();

  const isWishlisted = wishlist.includes(product.id);
  const isCompared = compareList.some((p) => p.id === product.id);

  return (
    <motion.article
      initial={{ opacity: 0, y: 15 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.35 }}
      className="group relative bg-white rounded-2xl border border-slate-200/90 shadow-card hover:shadow-card-hover hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between overflow-hidden"
      role="article"
      aria-label={product.name}
    >
      {/* Top Image Container */}
      <div className="relative aspect-4/3 w-full bg-slate-100 overflow-hidden border-b border-slate-100">
        <Image
          src={product.image}
          alt={product.name}
          fill
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
          className="object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
        />

        {/* Top Badges */}
        <div className="absolute top-2.5 left-2.5 flex flex-col gap-1 z-10">
          {product.badge && (
            <Badge variant="accent" size="sm" className="shadow-sm">
              {product.badge}
            </Badge>
          )}
          {product.isNew && !product.badge && (
            <Badge variant="primary" size="sm" className="shadow-sm">
              New Arrival
            </Badge>
          )}
        </div>

        {/* Floating Top-Right Action Buttons (Wishlist & Compare) */}
        <div className="absolute top-2.5 right-2.5 flex items-center gap-1.5 z-10">
          {/* Wishlist Button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              toggleWishlist(product.id);
            }}
            className={`p-1.5 rounded-full backdrop-blur-md shadow-md transition-all ${
              isWishlisted
                ? 'bg-rose-50 text-rose-600 border border-rose-200 scale-110'
                : 'bg-white/85 text-slate-600 hover:text-rose-600 hover:bg-white border border-slate-200/80'
            }`}
            aria-label={isWishlisted ? 'Remove from saved' : 'Save to wishlist'}
            title={isWishlisted ? 'Saved' : 'Save to wishlist'}
          >
            <Heart className={`w-4 h-4 ${isWishlisted ? 'fill-rose-500' : ''}`} />
          </button>

          {/* Compare Button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              addToCompare(product);
            }}
            className={`p-1.5 rounded-full backdrop-blur-md shadow-md transition-all ${
              isCompared
                ? 'bg-secondary text-white scale-110'
                : 'bg-white/85 text-slate-600 hover:text-secondary hover:bg-white border border-slate-200/80'
            }`}
            aria-label={isCompared ? 'In compare list' : 'Add to compare'}
            title={isCompared ? 'In Compare List' : 'Add to Compare'}
          >
            <BarChart2 className="w-4 h-4" />
          </button>
        </div>

        {/* Hover Quickview Reveal Button */}
        <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-navy-950/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <Button
            variant="secondary"
            size="sm"
            className="w-full text-xs shadow-lg"
            leftIcon={<Eye className="w-3.5 h-3.5" />}
            onClick={() => openQuickview(product)}
          >
            Quick View Specs
          </Button>
        </div>
      </div>

      {/* Card Body */}
      <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between space-y-3">
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="font-mono text-[11px] font-bold text-secondary uppercase tracking-wider">
              {product.model}
            </span>
            <span className="text-[10px] text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md font-medium">
              {product.category}
            </span>
          </div>

          <h3
            onClick={() => openQuickview(product)}
            className="text-sm sm:text-base font-bold text-slate-900 line-clamp-2 group-hover:text-secondary cursor-pointer transition-colors leading-snug"
          >
            {product.name}
          </h3>

          <p className="text-xs text-slate-500 line-clamp-2 mt-1 leading-relaxed">
            {product.shortDescription}
          </p>
        </div>

        {/* AI Key Feature Highlights */}
        {product.specs.aiFeatures && product.specs.aiFeatures.length > 0 && (
          <div className="pt-2 border-t border-slate-100">
            <div className="flex items-center gap-1 text-[11px] text-slate-600 font-medium truncate">
              <Cpu className="w-3 h-3 text-secondary shrink-0" />
              <span className="truncate">{product.specs.aiFeatures[0]}</span>
            </div>
          </div>
        )}

        {/* Bottom CTA Button */}
        <div className="pt-2">
          <Button
            variant="outline"
            size="sm"
            className="w-full text-xs hover:border-secondary hover:bg-blue-50/50 hover:text-secondary"
            leftIcon={<FileText className="w-3.5 h-3.5 text-secondary" />}
            onClick={() => addToQuote(product)}
          >
            Add to Quote (BOM)
          </Button>
        </div>
      </div>
    </motion.article>
  );
};

export const ProductsSection: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'new' | 'popular' | 'featured'>('featured');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  const categories = [
    'All',
    'CCTV Cameras',
    'Access Control',
    'Network Video Recorders',
    'Thermal & Fire',
    'Alarms & Radar',
    'Displays & Video Walls',
  ];

  // Filter logic
  const filteredProducts = useMemo(() => {
    return productsData.filter((p) => {
      // Tab filter
      let matchTab = true;
      if (activeTab === 'new') matchTab = !!p.isNew;
      if (activeTab === 'popular') matchTab = !!p.isPopular;
      if (activeTab === 'featured') matchTab = !!p.isFeatured;

      // Category filter
      const matchCat = selectedCategory === 'All' || p.category === selectedCategory;

      return matchTab && matchCat;
    });
  }, [activeTab, selectedCategory]);

  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage) || 1;
  const paginatedProducts = filteredProducts.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <section id="products" className="py-20 sm:py-24 bg-white relative">
      <Container>
        {/* Section Header */}
        <SectionHeader
          eyebrow="Enterprise Hardware Catalog"
          title="Engineered for Precision, Endurance & Scale"
          description="Explore our complete line-up of deep-learning surveillance cameras, multi-biometric access terminals, 8K enterprise video recorders, and perimeter radars."
        />

        {/* Main Tab Controls: New Arrivals | Most Popular | Featured */}
        <div className="flex justify-center mb-8">
          <div className="inline-flex p-1 rounded-xl bg-slate-100 border border-slate-200">
            {[
              { id: 'featured', label: '⭐ Featured Flagships' },
              { id: 'popular', label: '🔥 Most Popular' },
              { id: 'new', label: '✨ New Arrivals' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id as 'new' | 'popular' | 'featured');
                  setCurrentPage(1);
                }}
                className={`px-4 sm:px-6 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all ${
                  activeTab === tab.id
                    ? 'bg-white text-secondary shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Category Horizontal Filter Chips */}
        <div className="flex items-center justify-center gap-2 flex-wrap mb-10">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => {
                setSelectedCategory(cat);
                setCurrentPage(1);
              }}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all ${
                selectedCategory === cat
                  ? 'bg-primary text-white shadow-md'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Product Grid: 4 columns desktop, 2 tablet, 1 mobile */}
        {paginatedProducts.length === 0 ? (
          <div className="text-center py-16 bg-slate-50 rounded-2xl border border-slate-200">
            <p className="text-sm font-semibold text-slate-600">
              No products found in this category under "{activeTab.toUpperCase()}".
            </p>
            <Button
              variant="outline"
              size="sm"
              className="mt-3"
              onClick={() => {
                setSelectedCategory('All');
                setActiveTab('featured');
              }}
            >
              Reset Filters
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {paginatedProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="mt-12 flex items-center justify-center gap-2">
            <button
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="p-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
              aria-label="Previous page"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            {Array.from({ length: totalPages }).map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentPage(i + 1)}
                className={`w-9 h-9 rounded-lg text-xs font-bold transition-colors ${
                  currentPage === i + 1
                    ? 'bg-secondary text-white shadow-sm'
                    : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                {i + 1}
              </button>
            ))}

            <button
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              className="p-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
              aria-label="Next page"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </Container>
    </section>
  );
};
