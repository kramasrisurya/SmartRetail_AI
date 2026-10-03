# Aegis Security Enterprise Portal 🛡️

A production-grade corporate and product catalog web application for enterprise security solutions (AI video surveillance, biometric access control, network video recorders, perimeter radars, and thermal fire safety systems), referencing **Hikvision India** (`hikvisionindia.com`) UX patterns and visual hierarchy with 100% original branding and enterprise architecture.

---

## 🚀 Key Features & Modules

1. **Sticky Header & Multi-Column Mega Menu (4.1)**
   - Top utility bar with toll-free phone, corporate email, ISO credentials, and region switcher.
   - Dynamic 4-column mega menus on hover for **Products** and **Solutions** with category thumbnails.
   - Global search trigger, real-time Wishlist badge counter, Product Compare badge counter, and "Get a Quote" CTA.
   - Mobile slide-in drawer with collapsible accordions.

2. **Full-Width Hero Carousel (4.2)**
   - 4 full-width responsive slides (8K UltraDark PTZ, City-Scale ICCC Command Center, Touchless Speed Gates, Thermal Fire AI).
   - Auto-advance timer (6s), hover pause, swipe and arrow controls, progress dots.

3. **Trust Bar & Live Stats Strip (4.3)**
   - Key enterprise metrics (20+ Years, 500+ Clients, 50+ Countries, 24/7 Support, 1M+ Endpoints).

4. **About Us & Make-in-India Manufacturing (4.4)**
   - Two-column layout with multi-layered photo cards and domestic value addition badges.

5. **Tabbed Product Catalog & Specifications (4.5)**
   - Tabs: *New Arrivals*, *Most Popular*, *Featured Flagships*.
   - Filter chips across 6 equipment categories (Cameras, NVRs, Access Control, Thermal, Radar, Displays).
   - Interactive Product Cards with hover zoom, quickview modal trigger, wishlist bookmarking, compare toggle, and BOM quote insertion.
   - Numbered pagination.

6. **12 Industry Vertical Solutions (4.6)**
   - Comprehensive solution blueprints (Traffic, Education, Banking, Healthcare, Manufacturing, Transit, Smart City, Retail, Hospitality, Jewellery Vaults, Heritage, Critical Energy).
   - Detailed operational modals with recommended hardware ecosystems.

7. **Aegis Certified Engineer (ACE) Training Program (4.7)**
   - Dark theme container showcasing 3 credential tiers: ACSA-VMS (Associate), ACSP-EDGE (Professional), ACTE-ARCH (Expert Architect).

8. **Engineering Whitepapers & Press Releases (4.8)**
   - Featured article layout with interactive reader modal.

9. **Client Case Studies & Verified Ratings (4.9)**
   - Carousel of enterprise deployment testimonials (Airports, Commercial Banks, Tech Parks, Petrochemical Plants).

10. **Service, Support & Interactive Ticket Form (4.10)**
    - Direct hotlines (Toll-free 1800-209-9999, WhatsApp Business, Email desk).
    - Client-side validated form with error indicators and ticket generation.

11. **Newsletter Subscription (4.11)**
    - Inline corporate email validator with instant confirmation state.

12. **Enterprise 4-Column Footer (4.12)**
    - Comprehensive directory, 24/7 hotline banner, social media links, and anti-counterfeiting grey-market purchase disclaimer.

13. **Technical Modals & Comparison Matrix**
    - **Quickview Modal**: Detailed hardware specs, AI features, and compliance standards.
    - **Side-by-Side Compare Matrix**: Compare up to 4 models across sensors, resolution, IR range, WDR, and IP protection.
    - **Wishlist Drawer**: Saved products manager.
    - **BOM Quote Request Modal**: Multi-item project quote submission with SI partner margin benefits.
    - **Partner Portal Login**: System Integrator authentication and RMA serial tracker.
    - **Live Search Overlay**: Full-text instant search across models and solutions.

---

## 🛠️ Technical Stack

- **Framework**: Next.js 14+ (App Router)
- **UI & Styling**: Tailwind CSS, CSS Modules
- **State Management**: Zustand
- **Animations**: Framer Motion
- **Icons**: Lucide React
- **Typography**: Inter (Body) & Sora (Headings)
- **SEO**: Semantic HTML, OpenGraph, Twitter Cards, JSON-LD Schema

---

## 💻 Quick Start & Local Development

```bash
# Navigate to the project directory
cd apps/security-web

# Install dependencies (if not already installed)
npm install

# Start the Next.js development server
npm run dev

# Open in browser: http://localhost:3000
```

### Production Build
```bash
npm run build
npm start
```
