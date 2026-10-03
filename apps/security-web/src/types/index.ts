export interface Product {
  id: string;
  name: string;
  model: string;
  slug: string;
  category: 'CCTV Cameras' | 'Network Video Recorders' | 'Access Control' | 'Thermal & Fire' | 'Alarms & Radar' | 'Displays & Video Walls';
  subCategory: string;
  shortDescription: string;
  description: string;
  image: string;
  badge?: string;
  isNew?: boolean;
  isFeatured?: boolean;
  isPopular?: boolean;
  specs: {
    resolution?: string;
    sensor?: string;
    irRange?: string;
    wdr?: string;
    protectionRating?: string;
    aiFeatures?: string[];
    channels?: string;
    storage?: string;
    connectivity?: string;
    power?: string;
    operatingTemp?: string;
  };
  keyFeatures: string[];
  datasheetUrl?: string;
}

export interface Solution {
  id: string;
  title: string;
  slug: string;
  category: string;
  iconName: string;
  shortDescription: string;
  fullDescription: string;
  image: string;
  keyBenefits: string[];
  recommendedProducts: string[];
  stats: {
    label: string;
    value: string;
  };
}

export interface Certification {
  id: string;
  code: string;
  title: string;
  level: 'Associate' | 'Professional' | 'Expert';
  description: string;
  duration: string;
  badgeUrl: string;
  highlights: string[];
  targetAudience: string;
  examCode: string;
}

export interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  category: string;
  date: string;
  readTime: string;
  image: string;
  author: {
    name: string;
    role: string;
    avatar: string;
  };
  featured?: boolean;
}

export interface Testimonial {
  id: string;
  quote: string;
  author: string;
  role: string;
  company: string;
  location: string;
  rating: number;
  projectScope: string;
  avatar: string;
  logoUrl?: string;
}

export interface NavItem {
  label: string;
  href: string;
  hasMegaMenu?: boolean;
  megaMenuType?: 'products' | 'solutions';
}

export interface MegaMenuCategory {
  title: string;
  icon?: string;
  description?: string;
  featuredProduct?: {
    name: string;
    image: string;
    tag: string;
    link: string;
  };
  links: {
    name: string;
    description: string;
    href: string;
    badge?: string;
  }[];
}

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  title: string;
  message?: string;
}
