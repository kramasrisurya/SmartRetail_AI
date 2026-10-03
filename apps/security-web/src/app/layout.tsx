import type { Metadata } from 'next';
import { Inter, Sora } from 'next/font/google';
import './globals.css';
import { ToastContainer } from '../components/ui/ToastContainer';
import { QuickviewModal } from '../components/modals/QuickviewModal';
import { CompareDrawer } from '../components/modals/CompareDrawer';
import { WishlistDrawer } from '../components/modals/WishlistDrawer';
import { QuoteModal } from '../components/modals/QuoteModal';
import { SearchOverlay } from '../components/layout/SearchOverlay';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

const sora = Sora({
  subsets: ['latin'],
  variable: '--font-sora',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Aegis Security Solutions | Enterprise Video Surveillance, AI Cameras & Access Control',
  description:
    'Aegis Security is a premier manufacturer of 8K AI CCTV cameras, touchless biometric speed gates, 128-channel NVRs, thermal fire screening, and smart city security systems in India.',
  keywords: [
    'CCTV Cameras',
    'Enterprise Security',
    'Video Surveillance',
    'Access Control',
    '8K AI Cameras',
    'Face Recognition Terminal',
    'NVR Systems',
    'Smart City Surveillance',
    'Make in India Security',
    'AcuSense',
    'Thermal Camera',
  ],
  authors: [{ name: 'Aegis Security Systems' }],
  openGraph: {
    title: 'Aegis Security Solutions — Enterprise Vision & AI Systems',
    description:
      'Explore 100+ high-definition AI surveillance cameras, biometric access control turnstiles, and 12 vertical industry solutions.',
    url: 'https://aegis-security.com',
    siteName: 'Aegis Security Solutions',
    images: [
      {
        url: 'https://images.unsplash.com/photo-1557597774-9d273605dfa9?auto=format&fit=crop&w=1200&q=80',
        width: 1200,
        height: 630,
        alt: 'Aegis 8K AI Surveillance Solutions',
      },
    ],
    locale: 'en_IN',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Aegis Security Solutions — Enterprise Security & AI Surveillance',
    description: 'Transforming critical infrastructure protection with indigenous AI cameras and radar systems.',
    images: ['https://images.unsplash.com/photo-1557597774-9d273605dfa9?auto=format&fit=crop&w=1200&q=80'],
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'Aegis Security Systems Private Limited',
    url: 'https://aegis-security.com',
    logo: 'https://aegis-security.com/logo.png',
    contactPoint: {
      '@type': 'ContactPoint',
      telephone: '+91-1800-209-9999',
      contactType: 'customer support',
      areaServed: 'IN',
      availableLanguage: ['en', 'hi'],
    },
    sameAs: [
      'https://www.linkedin.com/company/aegis-security',
      'https://twitter.com/aegis_security',
      'https://www.youtube.com/c/aegissecurity',
    ],
  };

  return (
    <html lang="en" className={`${inter.variable} ${sora.variable}`}>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className="font-sans antialiased text-slate-900 bg-white min-h-screen flex flex-col selection:bg-secondary selection:text-white">
        {children}

        {/* Global Modals & Drawers */}
        <QuickviewModal />
        <CompareDrawer />
        <WishlistDrawer />
        <QuoteModal />
        <SearchOverlay />
        <ToastContainer />
      </body>
    </html>
  );
}
